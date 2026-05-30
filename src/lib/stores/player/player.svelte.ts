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
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'
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

	readonly #controller: PlaybackController

	repeat: PlayerRepeat = $state('none')
	muted = $state(false)
	#volume = $state(100)
	playbackRate = $state(1)
	preservePitch = $state(true)
	gaplessPlaybackEnabled = $state(false)
	pauseAfterTrackWhenRepeatIsOff = $state(false)

	get playing() {
		return this.#controller.playing
	}
	get currentTime() {
		return this.#controller.currentTime
	}
	get duration() {
		return this.#controller.duration
	}
	get loading() {
		return this.#controller.loading
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

	readonly #nextTrackAction = $derived.by(() => {
		if (this.repeat === 'one') {
			return { type: 'repeat-current' } as const
		}

		const isLast = this.#queue.activeTrackIndex >= this.#queue.itemsIds.length - 1
		if (this.repeat === 'none' && (isLast || this.pauseAfterTrackWhenRepeatIsOff)) {
			return { type: 'pause' } as const
		}

		const nextTrackId = this.#queue.getNextTrackId()
		if (nextTrackId === null) {
			return { type: 'pause' } as const
		}

		return { type: 'play-next', nextTrackId } as const
	})

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
			'pauseAfterTrackWhenRepeatIsOff',
		])
		persist('player', this.#queue, ['shuffle'])

		this.#controller = this.#createPlaybackController()

		this.#setupTrackChangeEffect()
		this.#setupPreloadEffect()
		this.#setupVolumeEffect()
		this.#setupPlaybackRateEffect()
		this.#setupMediaSession()

		if (import.meta.hot) {
			import.meta.hot.dispose(() => {
				this.#controller.abort()
			})
		}
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

			return {
				...result,
				duration: track.duration,
				codec: track.format?.codec ?? '',
			}
		}

		return new PlaybackController(this.#graph, {
			trackLoader,
			onTrackEnded: this.#handleTrackEnded,
			onError: this.#handleError,
			isGaplessEnabled: () => this.gaplessPlaybackEnabled,
		})
	}

	#setupVolumeEffect(): void {
		$effect(() => {
			if (!this.#graph.initialized) {
				return
			}

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
			this.#controller.setPlaybackRate(rate, preservePitch)
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

	#setupTrackChangeEffect(): void {
		$effect(() => {
			const track = this.activeTrack

			untrack(() => {
				if (!track) {
					this.#controller.abort()
				}
			})
		})
	}

	/**
	 * Watches currentTime. When close to the end of the current track,
	 * asks the player to preload the next track for gapless playback.
	 */
	#setupPreloadEffect(): void {
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

			const nextAction = this.#nextTrackAction

			untrack(() => {
				if (nextAction.type === 'play-next') {
					void this.#controller.preloadNext(nextAction.nextTrackId)
				} else {
					this.#controller.abortNext()
				}
			})
		})
	}

	#handleTrackEnded = () => {
		const action = this.#nextTrackAction

		if (action.type === 'play-next') {
			this.playNext()
			return
		}

		if (action.type === 'repeat-current') {
			this.#restartAndPlay()
			return
		}

		if (action.type === 'pause') {
			this.pause()

			if (this.#queue.activeTrackId) {
				this.#possiblySaveToPlayHistory(this.#queue.activeTrackId, true)
			}
		}
	}

	play = (): void => {
		if (!this.activeTrack) {
			return
		}

		this.#controller.switchToAndPlay(this.activeTrack.id)
	}

	pause = (): void => {
		this.#controller.pause()
	}

	seek = (time: number): void => {
		this.#controller.seek(time)
		this.#updateMediaSessionPosition(time)
	}

	playNext = (): void => {
		this.playTrack(this.#queue.getNextIndex())
	}

	playPrev = (): void => {
		if (this.currentTime > 3) {
			this.#restartAndPlay()
			return
		}

		this.playTrack(this.#queue.getPrevIndex())
	}

	playTrack = (
		trackIndex: number,
		queue?: readonly number[],
		options: PlayTrackOptions = {},
	): void => {
		const previousTrackId = this.#queue.activeTrackId
		const newTrackId = this.#queue.setTrack(trackIndex, queue, options)

		const isSameTrack = previousTrackId !== null && newTrackId === previousTrackId
		if (isSameTrack && this.#controller.currentStatus === 'ready') {
			this.#restartAndPlay()
			return
		}

		if (previousTrackId) {
			this.#possiblySaveToPlayHistory(previousTrackId)
		}

		if (newTrackId) {
			this.#controller.switchToAndPlay(newTrackId)
		}
	}

	#restartAndPlay = (): void => {
		this.seek(0)
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

	#possiblySaveToPlayHistory = (trackId: number, force = false): void => {
		const playedTime = this.currentTime
		const totalDuration = this.duration

		const percentageThreshold = 0.5
		const timeThreshold = 30

		const threshold = Math.min(timeThreshold, totalDuration * percentageThreshold)
		if (totalDuration > 0 && (playedTime >= threshold || force)) {
			void dbAddToPlayHistory(trackId)
		}
	}

	#handleError = (reason: FileLoadFailReason): void => {
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

			// We only want to update on every tick, to allow scrubbing, browser interpolates position itself.
			this.#updateMediaSessionPosition(untrack(() => this.currentTime))
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

	#updateMediaSessionPosition(currentTime: number): void {
		const { duration } = this
		// setPositionState throws otherwise
		if (duration <= 0) {
			return
		}

		navigator.mediaSession.setPositionState({
			duration,
			playbackRate: this.playbackRate,
			position: Math.min(currentTime, duration),
		})
	}
}
