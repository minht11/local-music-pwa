import { AudioGraph } from '$lib/audio/audio-graph.ts'
import type { LoadFailReason } from '$lib/audio/engine.ts'
import { EngineCoordinator } from '$lib/audio/engine-coordinator.svelte.ts'
import type { QueryResult } from '$lib/db/query/query.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { resolveTrackFile } from '$lib/helpers/file-resolver.ts'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
import { formatArtists, formatNameOrUnknown, truncate } from '$lib/helpers/utils/text.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import { createTrackQuery } from '$lib/library/get/value-queries.ts'
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'
import { EqualizerStore } from '$lib/stores/player/equalizer.svelte.ts'
import { type PlayTrackOptions, QueueStore } from './queue.svelte.ts'

export type { PlayTrackOptions }
export type PlayerRepeat = 'none' | 'one' | 'all'

// How many seconds before track end to begin pre-buffering the next track.
const PRE_BUFFER_THRESHOLD_SECONDS = 10

export const PLAYER_PLAYBACK_RATE_MIN = 0.5
export const PLAYER_PLAYBACK_RATE_MAX = 2

export class PlayerStore {
	readonly #graph = new AudioGraph()
	readonly #coordinator = new EngineCoordinator(this.#graph, {
		onTrackEnded: (wasGaplessPromotion) => this.#handleTrackEnded(wasGaplessPromotion),
		onError: () => this.#handleEngineError(),
		isGaplessEnabled: () => this.#main.gaplessPlaybackEnabled,
	})
	readonly #queue = new QueueStore()
	readonly equalizer = new EqualizerStore(this.#graph)

	repeat: PlayerRepeat = $state('none')
	playing: boolean = $state(false)
	muted: boolean = $state(false)
	#volume: number = $state(100)
	playbackRate: number = $state(1)
	preservePitch: boolean = $state(true)

	readonly #main = useMainStore()

	loading: boolean = $derived(this.#coordinator.loading)
	currentTime: number = $derived(this.#coordinator.currentTime)
	duration: number = $derived(this.#coordinator.duration)

	get shuffle(): boolean {
		return this.#queue.shuffle
	}
	get itemsIds(): readonly number[] {
		return this.#queue.itemsIds
	}
	get activeTrackIndex(): number {
		return this.#queue.activeTrackIndex
	}
	get isQueueEmpty(): boolean {
		return this.#queue.isQueueEmpty
	}

	#activeTrackQuery: QueryResult<TrackData | undefined> = createTrackQuery(
		() => this.#queue.itemsIds[this.#queue.activeTrackIndex] ?? -1,
		{ allowEmpty: true },
	)
	activeTrack: TrackData | undefined = $derived(this.#activeTrackQuery.value)

	#artwork = createManagedArtwork(() => this.activeTrack?.image?.full)
	artworkSrc: string | undefined = $derived.by(this.#artwork)

	get volume(): number {
		return this.#main.volumeSliderEnabled ? this.#volume : 100
	}
	set volume(value: number) {
		this.#volume = clamp(value, 0, 100)
	}

	#preBufferForTrackId: number | null = null

	constructor() {
		persist('player', this, ['volume', 'repeat', 'muted', 'playbackRate', 'preservePitch'])
		persist('player', this.#queue, ['shuffle'])

		this.equalizer.init()

		this.#setupTrackLoadEffect()
		this.#setupPreBufferEffect()
		this.#setupMediaSession()

		// TODO. Handle volume, playbackRate, and preservePitch options.
		// TODO. Should skip showing error when prebuffered track fails to load.
	}

	#setupTrackLoadEffect(): void {
		$effect(() => {
			const track = this.activeTrack

			if (!track) {
				this.#coordinator.abort()
				this.playing = false
				return
			}

			// Gapless transition already advanced the coordinator to this track.
			// Don't reload — just update the pre-buffer state.
			if (this.#coordinator.currentTrackId === track.id) {
				this.#preBufferForTrackId = null
				this.#updateMediaSessionPositionState()
				return
			}

			// Reset pre-buffer state for the new track.
			this.#preBufferForTrackId = null

			void this.#loadTrack(track)
		})
	}

	async #loadTrack(track: TrackData): Promise<void> {
		const trackId = track.id

		const resolved = await resolveTrackFile(track.directory, track.file)

		if (resolved.status !== 'loaded') {
			this.#showLoadError(resolved.status, track.name)
			return
		}

		// Track may have changed while we were resolving the file.
		if (this.activeTrack?.id !== trackId) {
			return
		}

		const result = await this.#coordinator.loadCurrent(track, resolved.file)

		if (result.status === 'failed') {
			this.#showLoadError(result.reason, track.name)

			return
		}

		// Restore playback if the player was playing before the track change.
		if (this.playing) {
			void this.#coordinator.play()
		}

		// TODO. Saves on load instead after implementing play history buffering.
		// Start play history timer.
		void this.#savePlayHistoryWhenReady(track)
	}

	/**
	 * Watches currentTime. When close to the end of the current track,
	 * resolves the next track's file and asks the coordinator to pre-buffer it.
	 */
	#setupPreBufferEffect(): void {
		$effect(() => {
			const duration = this.duration
			const current = this.currentTime
			const remaining = duration - current

			if (
				duration <= 0 ||
				remaining > PRE_BUFFER_THRESHOLD_SECONDS ||
				this.repeat === 'one'
			) {
				return
			}

			const nextId = this.#queue.getNextTrackId()
			if (nextId == null) {
				this.#preBufferForTrackId = null
				return
			}

			if (this.#preBufferForTrackId === nextId) {
				return
			}

			this.#preBufferForTrackId = nextId

			void this.#preBufferNext(nextId)
		})
	}

	async #preBufferNext(trackId: number): Promise<void> {
		const track = await getLibraryValue('tracks', trackId)
		if (!track) {
			return
		}

		// Confirm the track we're pre-buffering is still the right next track.
		if (this.#queue.getNextTrackId() !== trackId) {
			return
		}

		const resolved = await resolveTrackFile(track.directory, track.file)
		if (resolved.status !== 'loaded') {
			return
		}

		await this.#coordinator.preloadNext(track, resolved.file)
	}

	#handleTrackEnded(wasGaplessPromotion: boolean): void {
		if (this.repeat === 'one') {
			if (wasGaplessPromotion) {
				// The coordinator promoted the next track before we could intercept.
				// Abort it so the track-load effect sees currentTrackId change and
				// reloads the correct (repeat-one) track from the start.
				this.#coordinator.abort()
			} else {
				this.seek(0)
			}
			return
		}

		const nextIndex = this.#queue.getNextIndex()

		if (nextIndex === -1) {
			this.playing = false
			return
		}

		this.#queue.setTrack(nextIndex)
	}

	play = async (): Promise<void> => {
		if (!this.activeTrack || this.#coordinator.loading) {
			return
		}

		this.playing = true
		await this.#coordinator.play()
		this.#updateMediaSessionPositionState()
	}

	pause = (): void => {
		this.playing = false
		this.#coordinator.pause()
		this.#updateMediaSessionPositionState()
	}

	seek = (time: number): void => {
		this.#preBufferForTrackId = null
		this.#coordinator.seek(time)
		// Update ui time instantly
		this.currentTime = time
		this.#updateMediaSessionPositionState()
	}

	playNext = (): void => {
		this.playTrack(this.#queue.getNextIndex())
	}

	playPrev = (): void => {
		if (this.currentTime > 3) {
			this.seek(0)
			return
		}

		this.playTrack(this.#queue.getPrevIndex())
	}

	playTrack = (
		trackIndex: number,
		queue?: readonly number[],
		options: PlayTrackOptions = {},
	): void => {
		const currentTrackId = this.#queue.activeTrackId
		this.#queue.setTrack(trackIndex, queue, options)

		const isSameTrack = currentTrackId !== null && this.#queue.activeTrackId === currentTrackId

		if (isSameTrack) {
			// Reset time to 0
			this.seek(0)
		} else {
			// Update ui time instantly
			this.currentTime = 0
		}

		this.playing = true
	}

	togglePlay = (): void => {
		if (this.playing) {
			this.pause()
		} else {
			void this.play()
		}
	}

	toggleRepeat = (): void => {
		let { repeat } = this

		if (repeat === 'none') {
			repeat = 'all'
		} else if (repeat === 'all') {
			repeat = 'one'
		} else {
			repeat = 'none'
		}

		this.repeat = repeat
	}

	toggleShuffle = this.#queue.toggleShuffle
	addToQueue = this.#queue.addToQueue
	removeFromQueue = this.#queue.removeFromQueue
	moveQueueItem = this.#queue.moveQueueItem
	clearQueue = this.#queue.clearQueue

	#handleEngineError(): void {
		this.playing = false
		snackbar({
			id: 'failed-to-load-audio',
			message: m.playerAudioErrorLoadError({
				name: this.activeTrack?.name ?? 'Unknown track',
			}),
			duration: 10_000,
		})
	}

	#showLoadError(reason: LoadFailReason, trackName: string): void {
		if (reason === 'superseded') {
			return
		}

		const name = truncate(trackName, 30)
		const errorMap = {
			'not-found': m.playerAudioErrorNotFound,
			'permission-denied': m.playerAudioErrorPermissionDenied,
			error: m.playerAudioErrorLoadError,
		}

		snackbar({
			id: 'failed-to-load-audio',
			message: errorMap[reason]({ name }),
			duration: 10_000,
		})
	}

	#setupMediaSession(): void {
		const ms = navigator.mediaSession
		const setAction = ms.setActionHandler.bind(ms)

		setAction('play', () => void this.play())
		setAction('pause', () => this.pause())
		setAction('nexttrack', this.playNext)
		setAction('previoustrack', this.playPrev)
		setAction('seekbackward', () => this.seek(Math.max(this.currentTime - 10, 0)))
		setAction('seekforward', () => this.seek(Math.min(this.currentTime + 10, this.duration)))
		setAction('seekto', ({ seekTime }) => {
			if (seekTime != null) {
				this.seek(seekTime)
			}
		})

		$effect(() => {
			ms.playbackState = this.playing ? 'playing' : 'paused'
		})

		$effect(() => {
			const track = this.activeTrack
			if (!track) {
				ms.metadata = null
				return
			}

			const fallbackArtworkSrc = new URL('/artwork.svg', location.origin).toString()
			ms.metadata = new MediaMetadata({
				title: track.name,
				artist: formatArtists(track.artists),
				album: formatNameOrUnknown(track.album),
				artwork: [
					{
						src: this.artworkSrc ?? fallbackArtworkSrc,
					},
				],
			})
		})
	}

	#updateMediaSessionPositionState(): void {
		if (!this.activeTrack) {
			return
		}

		try {
			navigator.mediaSession.setPositionState({
				duration: this.duration,
				playbackRate: this.playbackRate,
				position: Math.min(this.currentTime, this.duration),
			})
		} catch {
			// do nothing
		}
	}

	async #savePlayHistoryWhenReady(track: TrackData): Promise<void> {
		const playedTime = this.currentTime
		const totalDuration = this.duration

		const percentageThreshold = 0.5
		const timeThreshold = 30

		const threshold = Math.min(timeThreshold, totalDuration * percentageThreshold)
		if (totalDuration > 0 && playedTime >= threshold) {
			await dbAddToPlayHistory(track.id)
		}
	}
}
