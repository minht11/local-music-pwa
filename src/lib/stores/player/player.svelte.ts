import { AudioGraph } from '$lib/audio/audio-graph.svelte.ts'
import { PlaybackController, type TrackLoader } from '$lib/audio/playback-controller.svelte.ts'
import {
	createManagedArtwork,
	getTrackManagedArtworkSource,
} from '$lib/helpers/create-managed-artwork.svelte'
import { type FileLoadFailReason, resolveTrackFile } from '$lib/helpers/file-resolver.ts'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { truncate } from '$lib/helpers/utils/text.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import { createTrackQuery } from '$lib/library/get/value-queries.ts'
import { EqualizerStore } from '$lib/stores/player/equalizer.svelte.ts'
import type { MainStore } from '../main/store.svelte.ts'
import { MediaSessionController } from './media-session.svelte.ts'
import { PlayHistoryTracker } from './play-history-tracker.ts'
import { QueueStore } from './queue.svelte.ts'

export type PlayerRepeat = 'none' | 'one' | 'all'

// How many seconds before track end to begin pre-buffering the next track.
const PRE_BUFFER_THRESHOLD_SECONDS = 10

export const PLAYER_PLAYBACK_RATE_MIN = 0.5
export const PLAYER_PLAYBACK_RATE_MAX = 2

export class PlayerStore {
	readonly #graph = new AudioGraph()
	readonly #queue = new QueueStore()
	readonly #history = new PlayHistoryTracker()
	readonly #ms = new MediaSessionController(this)
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
		return this.#queue.current?.index ?? -1
	}
	get isQueueEmpty() {
		return this.#queue.isQueueEmpty
	}

	/** Returns the next track to play based on the current repeat mode and queue state. */
	readonly #upNext = $derived.by(() => {
		if (this.repeat === 'none' && this.pauseAfterTrackWhenRepeatIsOff) {
			return null
		}

		if (this.repeat === 'one') {
			return this.#queue.current
		}

		return this.#queue.peekNext(this.repeat === 'all')
	})

	readonly #activeTrackQuery = createTrackQuery(() => this.#queue.current?.id ?? -1, {
		allowEmpty: true,
	})
	readonly activeTrack = $derived(this.#activeTrackQuery.value)

	readonly #artwork = createManagedArtwork(() =>
		getTrackManagedArtworkSource(this.activeTrack, 'full'),
	)
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
		this.#setupPlayHistoryEffect()
	}

	#createPlaybackController() {
		const trackLoader: TrackLoader = async (trackId, reason) => {
			const track = await getLibraryValue('tracks', trackId)

			const result = await resolveTrackFile({
				directoryId: track.directory,
				entity: track.file,
				// Preload should stay silent
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

			if (duration <= 0 || remaining > PRE_BUFFER_THRESHOLD_SECONDS) {
				return
			}

			const upNext = this.#upNext

			untrack(() => {
				if (upNext) {
					void this.#controller.preloadNext(upNext.id)
				} else {
					this.#controller.abortNext()
				}
			})
		})
	}

	#handleTrackEnded = () => {
		this.#history.complete()

		const upNext = this.#upNext
		if (!upNext) {
			this.pause()
			return
		}

		this.#queue.setTrack(upNext.index)
		this.#controller.play(upNext.id, {
			gapless: true,
			fromBeginning: true,
		})
	}

	play = (): void => {
		if (!this.activeTrack) {
			return
		}

		this.#controller.play(this.activeTrack.id)
	}

	pause = (): void => {
		this.#controller.pause()
	}

	seek = (time: number): void => {
		this.#controller.seek(time)
		this.#ms.updatePosition(time)
	}

	playNext = (): void => {
		const next = this.#queue.peekNext(true)

		if (next !== null) {
			this.playTrack(next.index)
		}
	}

	playPrev = (): void => {
		if (this.currentTime > 3) {
			if (this.activeTrack) {
				this.#controller.play(this.activeTrack.id, { fromBeginning: true })
			}

			return
		}

		const prev = this.#queue.peekPrev(true)

		if (prev !== null) {
			this.playTrack(prev.index)
		}
	}

	playTrack = (trackIndex: number | 'shuffle', queue?: readonly number[]): void => {
		const newTrackId = this.#queue.setTrack(trackIndex, queue)

		if (newTrackId) {
			this.#controller.play(newTrackId, {
				fromBeginning: true,
			})
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

	#setupPlayHistoryEffect(): void {
		$effect(() => {
			const trackId = this.#queue.current?.id
			if (trackId == null) {
				return
			}

			untrack(() => this.#history.begin(trackId))
		})

		$effect(() => {
			const currentTime = this.currentTime
			const duration = this.duration
			untrack(() => this.#history.update(currentTime, duration))
		})
	}

	dispose(): void {
		this.#controller.abort()
		this.#graph.dispose()
	}
}
