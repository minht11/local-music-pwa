import { AudioGraph } from '$lib/audio/audio-graph.ts'
import { AudioPlayer } from '$lib/audio/audio-player.svelte.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { type FileLoadFailReason, resolveTrackFile } from '$lib/helpers/file-resolver.ts'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
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
	readonly #player = new AudioPlayer(this.#graph, {
		trackEndPolicy: () => (this.repeat === 'one' ? 'repeat' : 'advance'),
		onTrackEnded: () => this.#handleTrackEnded(),
		onError: (reason) => this.#handleError(reason),
		isGaplessEnabled: () => this.#main.gaplessPlaybackEnabled,
	})
	readonly #queue = new QueueStore()
	readonly equalizer = new EqualizerStore(this.#graph)

	repeat = $state<PlayerRepeat>('none')
	muted = $state(false)
	#volume = $state(100)
	playbackRate = $state(1)
	preservePitch = $state(true)
	#loadRetry = $state(0)

	readonly #main: MainStore

	get playing(): boolean {
		return this.#player.playing
	}

	loading: boolean = $derived(this.#player.loading)
	currentTime: number = $derived(this.#player.currentTime)
	duration: number = $derived(this.#player.duration)

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

	#activeTrackQuery = createTrackQuery(
		() => this.#queue.itemsIds[this.#queue.activeTrackIndex] ?? -1,
		{ allowEmpty: true },
	)
	activeTrack = $derived(this.#activeTrackQuery.value)

	#artwork = createManagedArtwork(() => this.activeTrack?.image?.full)
	artworkSrc: string | undefined = $derived.by(this.#artwork)

	get volume(): number {
		return this.#main.volumeSliderEnabled ? this.#volume : 100
	}
	set volume(value: number) {
		this.#volume = clamp(value, 0, 100)
	}

	constructor(main: MainStore) {
		this.#main = main

		persist('player', this, ['volume', 'repeat', 'muted', 'playbackRate', 'preservePitch'])
		persist('player', this.#queue, ['shuffle'])

		this.equalizer.init()

		this.#setupTrackLoadEffect()
		this.#setupPreBufferEffect()
		this.#setupMediaSession()
		this.#setupVolumeEffect()
		// TODO. Add playbackRate, preservePitch and playHistory.
	}

	#setupVolumeEffect(): void {
		$effect(() => {
			this.#graph.setVolume(this.muted ? 0 : this.volume / 100)
		})
	}

	#setupTrackLoadEffect(): void {
		$effect(() => {
			const track = this.activeTrack
			void this.#loadRetry

			untrack(() => {
				if (!track) {
					this.#player.abort()
					return
				}

				const { currentStatus, currentTrackId } = this.#player

				// Gapless promotion already moved the coordinator to this track,
				// or it's already loading/ready — don't reload.
				if (currentTrackId === track.id && currentStatus !== 'failed') {
					return
				}

				const loader = async () => {
					const result = await resolveTrackFile({
						directoryId: track.directory,
						entity: track.file,
						askPermission: true,
					})
					return { ...result, track }
				}
				this.#player.load(track.id, loader, track.duration)
			})
		})
	}

	/**
	 * Watches currentTime. When close to the end of the current track,
	 * asks the coordinator to pre-buffer the next track for gapless playback.
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

			// Already scheduled (or determined unavailable) for this track — skip.
			if (this.#player.nextScheduledTrackId === nextId) {
				return
			}

			untrack(() => {
				void this.#preBufferNext(nextId)
			})
		})
	}

	async #preBufferNext(trackId: number): Promise<void> {
		await this.#player.scheduleNext(trackId, async () => {
			const track = await getLibraryValue('tracks', trackId)
			if (!track) {
				return { status: 'error' }
			}

			const result = await resolveTrackFile({
				directoryId: track.directory,
				entity: track.file,
				askPermission: false,
			})

			return {
				...result,
				track,
			}
		})
	}

	#handleTrackEnded(): void {
		if (this.repeat === 'one') {
			// Coordinator is now idle (track ended, repeat policy discarded promotion).
			// coordinator.playing is still true so the reload will auto-play.
			this.#loadRetry += 1
			return
		}

		const isLastTrack = this.#queue.activeTrackIndex === this.#queue.itemsIds.length - 1
		if (this.repeat === 'none' && isLastTrack) {
			this.#player.abort()
			return
		}

		this.#queue.setTrack(this.#queue.getNextIndex())
	}

	play = (): void => {
		if (!this.activeTrack) {
			return
		}

		const { currentStatus, currentTrackId } = this.#player
		const wrongTrack = currentTrackId !== this.activeTrack.id

		// Trigger the load effect when the coordinator can't play by itself:
		// idle (no engine), failed (needs retry), or loaded the wrong track.
		if (currentStatus === 'idle' || currentStatus === 'failed' || wrongTrack) {
			this.#loadRetry += 1
		}

		this.#player.play()
	}

	pause = (): void => {
		this.#player.pause()
	}

	seek = (time: number): void => {
		this.#player.seek(time)
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
			this.seek(0)
		} else {
			this.currentTime = 0
		}

		this.play()
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

		setAction('play', () => this.play())
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
			ms.setPositionState({
				duration: this.duration,
				playbackRate: this.playbackRate,
				// Position does not need to be updated on every tick, browser will interpolate it
				position: untrack(() => Math.min(this.currentTime, this.duration)),
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
