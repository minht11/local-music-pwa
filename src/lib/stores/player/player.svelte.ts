import { AudioGraph } from '$lib/audio/audio-graph.svelte.ts'
import { PlaybackController, type TrackLoader } from '$lib/audio/playback-controller.svelte.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { type FileLoadFailReason, resolveTrackFile } from '$lib/helpers/file-resolver.ts'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { formatArtists, formatNameOrUnknown, truncate } from '$lib/helpers/utils/text.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import { createTrackQuery } from '$lib/library/get/value-queries.ts'
import { EqualizerStore } from '$lib/stores/player/equalizer.svelte.ts'
import type { MainStore } from '../main/store.svelte.ts'
import { type PlayTrackOptions, QueueStore } from './queue.svelte.ts'

export type { PlayTrackOptions }
export type PlayerRepeat = 'none' | 'one' | 'all'

// How many seconds before track end to begin pre-buffering the next track.
const PRE_BUFFER_THRESHOLD_SECONDS = 10

export const PLAYER_PLAYBACK_RATE_MIN = 0.5
export const PLAYER_PLAYBACK_RATE_MAX = 2

export class PlayerStore {
	readonly #graph = new AudioGraph()
	readonly #queue = new QueueStore()
	readonly equalizer = new EqualizerStore(this.#graph)
	readonly #main: MainStore

	readonly #playbackController: PlaybackController

	repeat = $state<PlayerRepeat>('none')
	muted = $state(false)
	#volume = $state(100)
	playbackRate = $state(1)
	preservePitch = $state(true)
	gaplessPlaybackEnabled: boolean = $state(false)

	get playing() {
		return this.#playbackController.playing
	}
	get currentTime() {
		return this.#playbackController.currentTime
	}
	get duration() {
		return this.#playbackController.duration
	}
	get loading() {
		return this.#playbackController.loading
	}

	get shuffle() {
		return this.#queue.shuffle
	}
	get itemsIds() {
		return this.#queue.itemsIds
	}
	get activeTrackIndex() {
		return this.#queue.activeTrackIndex
	}
	get isQueueEmpty() {
		return this.#queue.isQueueEmpty
	}

	readonly #activeTrackQuery = createTrackQuery(() => this.#queue.activeTrackId ?? -1, {
		allowEmpty: true,
	})
	readonly activeTrack = $derived(this.#activeTrackQuery.value)

	readonly #artwork = createManagedArtwork(() => this.activeTrack?.image?.full)
	readonly artworkSrc = $derived.by(this.#artwork)

	get volume() {
		return this.#main.volumeSliderEnabled ? this.#volume : 100
	}

	set volume(value) {
		this.#volume = clamp(value, 0, 100)
	}

	constructor(main: MainStore) {
		this.#main = main

		persist('player', this, [
			'volume',
			'repeat',
			'muted',
			'playbackRate',
			'preservePitch',
			'gaplessPlaybackEnabled',
		])
		persist('player', this.#queue, ['shuffle'])

		this.#playbackController = this.#createPlaybackController()

		this.#setupTrackLoadEffect()
		this.#setupPreBufferEffect()
		this.#setupMediaSession()
		this.#setupVolumeEffect()
		this.#setupPlaybackRateEffect()
		// TODO. Add playHistory.
	}

	#createPlaybackController() {
		const trackLoader: TrackLoader = async (trackId, reason) => {
			const track = await getLibraryValue('tracks', trackId)

			const result = await resolveTrackFile({
				directoryId: track.directory,
				entity: track.file,
				// On schedule we want to be silent
				askPermission: reason === 'load',
			})

			return { ...result, duration: track.duration, codec: track.format?.codec ?? '' }
		}

		return new PlaybackController(this.#graph, {
			trackLoader,
			trackEndPolicy: () => (this.repeat === 'one' ? 'repeat' : 'advance'),
			onTrackEnded: () => this.#handleTrackEnded(),
			onError: (reason) => this.#handleError(reason),
			isGaplessEnabled: () => this.gaplessPlaybackEnabled,
		})
	}

	#setupVolumeEffect(): void {
		$effect(() => {
			const muted = this.muted

			// Humans perceive volume logarithmically
			// so we adjust the volume to match that perception
			const k = 0.5
			const volume = (this.volume / 100) ** k

			untrack(() => {
				this.#graph.setVolume(muted ? 0 : volume)
			})
		})
	}

	#setupPlaybackRateEffect(): void {
		const updatePlaybackRate = debounce((rate: number, preservePitch: boolean) => {
			this.#playbackController.setPlaybackRate(rate, preservePitch)
		}, 200)

		$effect(() => {
			const rate = this.playbackRate
			// With gapless playback enabled we don't support pitch option.
			const preservePitch = this.preservePitch && !this.gaplessPlaybackEnabled

			untrack(() => {
				updatePlaybackRate(rate, preservePitch)
			})
		})
	}

	#setupTrackLoadEffect(): void {
		$effect(() => {
			const track = this.activeTrack

			untrack(() => {
				if (!track) {
					this.#playbackController.abort()
				}
			})
		})
	}

	/**
	 * Watches currentTime. When close to the end of the current track,
	 * asks the player to pre-buffer the next track for gapless playback.
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

			// Don't pre-buffer if we'd wrap around at end of queue with repeat=none.
			const isAtQueueEnd = this.#queue.activeTrackIndex >= this.#queue.itemsIds.length - 1
			if (this.repeat === 'none' && isAtQueueEnd) {
				return
			}

			const nextId = this.#queue.getNextTrackId()
			if (nextId == null) {
				return
			}

			untrack(() => {
				void this.#playbackController.scheduleNext(nextId)
			})
		})
	}

	#handleTrackEnded(): void {
		if (this.repeat === 'one') {
			this.seek(0)
			return
		}

		const isLastTrack = this.#queue.activeTrackIndex === this.#queue.itemsIds.length - 1
		if (this.repeat === 'none' && isLastTrack) {
			this.pause()
			return
		}

		this.playNext()
	}

	play = (): void => {
		if (!this.activeTrack) {
			return
		}

		this.#playbackController.switchToAndPlay(this.activeTrack.id)
	}

	pause = (): void => {
		this.#playbackController.pause()
	}

	seek = (time: number): void => {
		this.#playbackController.seek(time)
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
		if (isSameTrack && this.#playbackController.currentStatus === 'ready') {
			this.seek(0)
			return
		}

		if (this.#queue.activeTrackId) {
			this.#playbackController.switchToAndPlay(this.#queue.activeTrackId)
		}
	}

	togglePlay = (): void => {
		if (this.playing) {
			this.pause()
		} else {
			this.play()
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

	#handleError(reason: FileLoadFailReason): void {
		const name = truncate(this.activeTrack?.name ?? 'Unknown', 30)
		const errorMap = {
			'not-found': m.playerAudioErrorNotFound,
			'permission-denied': m.playerAudioErrorPermissionDenied,
			error: m.playerAudioErrorLoadError,
		} as const
		snackbar({
			id: 'failed-to-load-audio',
			message: errorMap[reason]({ name }),
			duration: 10_000,
		})
	}

	#setupMediaSession(): void {
		const ms = navigator.mediaSession
		const setAction = ms.setActionHandler.bind(ms)

		setAction('play', this.play)
		setAction('pause', this.pause)
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
			const { duration } = this
			// setPositionState throws otherwise
			if (duration <= 0) {
				return
			}

			ms.setPositionState({
				duration,
				playbackRate: this.playbackRate,
				// Position does not need to be updated on every tick, browser will interpolate it
				position: untrack(() => Math.min(this.currentTime, duration)),
			})
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
}
