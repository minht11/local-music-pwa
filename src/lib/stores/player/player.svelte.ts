import { AudioGraph } from '$lib/audio/audio-graph.svelte.ts'
import { PlaybackController, type TrackLoader } from '$lib/audio/playback-controller.svelte.ts'
import { onDatabaseChange } from '$lib/db/events.ts'
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
import { type QueueEntry, type QueueOrigin, QueueStore, type QueueView } from './queue.svelte.ts'

export type PlayerRepeat = 'none' | 'one' | 'all'

type TrackEndAction =
	| { kind: 'pause' }
	| { kind: 'repeat-current' }
	| {
			kind: 'advance'
			/** Should wrap at the queue's end */
			loop: boolean
	  }

// How many seconds before track end to begin pre-buffering the next track.
const PRE_BUFFER_THRESHOLD_SECONDS = 10

export const PLAYER_PLAYBACK_RATE_MIN = 0.5
export const PLAYER_PLAYBACK_RATE_MAX = 2

export class PlayerStore {
	readonly #graph = new AudioGraph()
	readonly #queue = new QueueStore()
	/** Narrowed to `QueueView`, which cannot start audio. */
	readonly queue: QueueView = this.#queue
	readonly #history = new PlayHistoryTracker()
	readonly #ms = new MediaSessionController(this)
	readonly equalizer = new EqualizerStore(this.#graph)
	readonly #main: MainStore

	readonly #controller: PlaybackController
	#removeDatabaseListener: (() => void) | undefined

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

	/**
	 * What happens when the current track ends, decided in one place so the
	 * preload effect (which peeks) and the ended handler (which consumes) cannot
	 * disagree — a drift between them would gapless-preload a different track
	 * than the one that then plays.
	 */
	readonly #trackEndAction: TrackEndAction = $derived.by((): TrackEndAction => {
		if (this.repeat === 'none' && this.pauseAfterTrackWhenRepeatIsOff) {
			return { kind: 'pause' }
		}

		if (this.repeat === 'one') {
			return { kind: 'repeat-current' }
		}

		return { kind: 'advance', loop: this.repeat === 'all' }
	})

	/**
	 * The track that plays when the current one ends, or null when playback stops
	 * there. Folds in repeat and the loop-wrap, so it is not the same question as
	 * "does the queue have upcoming rows": with repeat on, an exhausted queue still
	 * has something up next.
	 */
	readonly upNextTrackId: number | null = $derived.by(() => {
		const action = this.#trackEndAction
		if (action.kind === 'pause') {
			return null
		}

		if (action.kind === 'repeat-current') {
			return this.#queue.current?.trackId ?? null
		}

		return this.#queue.peekNext(action.loop)
	})

	readonly #activeTrackQuery = createTrackQuery(() => this.#queue.current?.trackId ?? -1, {
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
		this.#setupQueueDatabaseListener()

		this.#setupTrackChangeEffect()
		this.#setupPreloadEffect()
		this.#setupVolumeEffect()
		this.#setupPlaybackRateEffect()
		this.#setupPlayHistoryEffect()
	}

	#setupQueueDatabaseListener(): void {
		this.#removeDatabaseListener = onDatabaseChange((changes) => {
			const deletedTrackIds = new Set<number>()
			for (const change of changes) {
				if (change.storeName === 'tracks' && change.operation === 'delete') {
					deletedTrackIds.add(change.key)
				}
			}

			if (deletedTrackIds.size === 0) {
				return
			}

			const previous = this.#queue.current
			this.#queue.removeTracks([...deletedTrackIds])

			if (previous === null || !deletedTrackIds.has(previous.trackId)) {
				return
			}

			const next =
				previous.layer === 'manual' ? this.#queue.advance(false) : this.#queue.current
			if (next === null) {
				this.#controller.abort()
			} else {
				this.#startEntry(next)
			}
		})
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

			// Humans perceive volume logarithmically, so match that perception.
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

	#setupPreloadEffect(): void {
		$effect(() => {
			const duration = this.duration
			const current = this.currentTime
			const remaining = duration - current

			if (duration <= 0 || remaining > PRE_BUFFER_THRESHOLD_SECONDS) {
				return
			}

			const upNext = this.upNextTrackId

			untrack(() => {
				if (upNext === null) {
					this.#controller.abortNext()
				} else {
					void this.#controller.preloadNext(upNext)
				}
			})
		})
	}

	#handleTrackEnded = () => {
		this.#history.complete()

		const action = this.#trackEndAction
		if (action.kind === 'pause') {
			this.pause()
			return
		}

		const next =
			action.kind === 'repeat-current'
				? this.#queue.current
				: this.#queue.advance(action.loop)

		if (!next) {
			this.pause()
			return
		}

		this.#controller.play(next.trackId, {
			gapless: true,
			fromBeginning: true,
		})
	}

	/**
	 * Gated on the queue, not `activeTrack`: that is an async query and may not have
	 * resolved yet. The controller's loader fetches the track itself.
	 */
	play = (): void => {
		const trackId = this.#queue.current?.trackId
		if (trackId === undefined) {
			return
		}

		this.#controller.play(trackId)
	}

	pause = (): void => {
		this.#controller.pause()
	}

	seek = (time: number): void => {
		this.#controller.seek(time)
		this.#ms.updatePosition(time)
	}

	/**
	 * Every playback-affecting queue command reports the row it landed on, or null
	 * when it was a no-op (queue end, unknown row) — which leaves playback alone.
	 */
	#startEntry = (entry: QueueEntry | null): void => {
		if (entry !== null) {
			this.#controller.play(entry.trackId, { fromBeginning: true })
		}
	}

	playNext = (): void => {
		this.#startEntry(this.#queue.advance(true))
	}

	playPrev = (): void => {
		// Past the restart threshold "previous" means restarting the current track.
		if (this.currentTime > 3) {
			this.#startEntry(this.#queue.current)

			return
		}

		this.#startEntry(this.#queue.stepBack(true))
	}

	/** Replaces the source queue with `list` and starts playback at `start`. */
	playFrom = (start: number | 'shuffle', list: readonly number[], origin?: QueueOrigin): void => {
		this.#startEntry(this.#queue.setSource(list, start, origin))
	}

	playQueueEntry = (entryId: number): void => {
		this.#startEntry(this.#queue.playEntry(entryId))
	}

	/** Plays a track id wherever it lives: jumps in the source queue, else starts fresh. */
	playTrackId = (id: number): void => {
		this.#startEntry(this.#queue.playTrackId(id))
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
			const trackId = this.#queue.current?.trackId
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
		this.#removeDatabaseListener?.()
		this.#controller.abort()
		this.#graph.dispose()
	}
}
