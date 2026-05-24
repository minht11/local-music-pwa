// @ts-nocheck
// biome-ignore-all lint: a
// PREVIOUS IMPLEMENTATION. LEFT BROKEN FOR REFERENCE DURING GAPLESS REWORK.
// TODO. Remove this file.

import type { QueryResult } from '$lib/db/query/query.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { canTrackUseGapless, isGaplessSupported } from '$lib/helpers/gapless/capability.ts'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { formatArtists, truncate } from '$lib/helpers/utils/text.ts'
import { throttle } from '$lib/helpers/utils/throttle.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import { createTrackQuery, type TrackData } from '$lib/library/get/value-queries.ts'
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'
import { AudioLoader } from './audio-loader.svelte.ts'
import { EqualizerStore } from './equalizer.svelte.ts'
import { GaplessLoader } from './gapless-loader.svelte.ts'
import { type PlayTrackOptions, QueueStore } from './queue.svelte.ts'

export type { PlayTrackOptions }

export type PlayerRepeat = 'none' | 'one' | 'all'

export const PLAYER_PLAYBACK_RATE_MIN = 0.5
export const PLAYER_PLAYBACK_RATE_MAX = 2

export class PlayerStore {
	readonly #main = useMainStore()

	readonly #audio = new Audio()
	readonly #audioLoader = new AudioLoader((src) => {
		console.log('AudioLoader: Setting audio src', { src })
		this.#audio.src = src ?? ''
	})
	readonly #queue = new QueueStore()
	readonly equalizer = new EqualizerStore(this.#audio)

	#gaplessLoader = new GaplessLoader(this.equalizer)
	#gaplessPrebufLoader = new GaplessLoader(this.equalizer)

	#handleGaplessEnded = (): void => {
		if (this.repeat === 'one') {
			this.seek(0)
		}
	}
	#usingGapless: boolean = $state(false)
	#gaplessTrackEndTime = 0
	#preBufferingNext = false
	#prebufferedTrackId: number | null = null
	#rafId = 0
	#requestId = 0
	#prebufTimeoutId: number | null = null

	repeat: PlayerRepeat = $state('none')
	playing: boolean = $state(false)
	muted: boolean = $state(false)
	#volume: number = $state(100)

	playbackRate: number = $state(1)
	preservePitch: boolean = $state(true)

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

	loading: boolean = $derived(this.#audioLoader.loading || this.#gaplessLoader.loading)

	currentTime: number = $state(0)
	duration: number = $state(0)

	get currentTimePrecise(): number {
		if (this.#usingGapless) {
			return this.#gaplessLoader.currentTime
		}

		return this.#audio.currentTime
	}

	get volume(): number {
		return this.#main.volumeSliderEnabled ? this.#volume : 100
	}

	set volume(value: number) {
		this.#volume = clamp(value, 0, 100)
	}

	#activeTrackQuery: QueryResult<TrackData | undefined> = createTrackQuery(
		() => this.#queue.itemsIds[this.#queue.activeTrackIndex] ?? -1,
		{ allowEmpty: true },
	)

	activeTrack: TrackData | undefined = $derived(this.#activeTrackQuery.value)

	#artwork = createManagedArtwork(() => this.activeTrack?.image?.full)
	artworkSrc: string | undefined = $derived.by(this.#artwork)

	constructor() {
		persist('player', this, ['volume', 'repeat', 'muted', 'playbackRate', 'preservePitch'])
		persist('player', this.#queue, ['shuffle'])

		this.equalizer.init()

		this.#gaplessLoader.onEnded = () => this.#handleGaplessEnded()
		this.#gaplessPrebufLoader.onEnded = () => this.#handleGaplessEnded()

		const audio = this.#audio

		// Plain (non-$state) so reads inside the effect don't create subscriptions.
		let prevTrackId: number | null = null

		// Debounced to recover from transient undefined during a DB refresh.
		const scheduleAudioReset = debounce(() => {
			if (!this.activeTrack) {
				this.#audioLoader.reset()
				this.#abortGapless()
				this.currentTime = 0
				this.duration = 0
				this.playing = false
			}
		}, 100)

		const trackChanged = (track: TrackData | undefined) => {
			if (!track) {
				if (prevTrackId !== null) {
					this.#savePlayHistory(prevTrackId)

					prevTrackId = null
				}
				scheduleAudioReset()
				return
			}

			if (track.id === prevTrackId) {
				return
			}

			scheduleAudioReset.cancel()

			if (prevTrackId !== null) {
				this.#savePlayHistory(prevTrackId)
			}

			prevTrackId = track.id
			this.currentTime = 0
			this.duration = 0

			this.#requestId += 1
			const gen = this.#requestId

			const useGapless =
				this.#main.gaplessPlaybackEnabled &&
				isGaplessSupported() &&
				canTrackUseGapless(track)

			this.#usingGapless = useGapless

			if (useGapless) {
				// If this track was already pre-buffered, swap loaders instead of reloading.
				if (track.id === this.#prebufferedTrackId) {
					;[this.#gaplessLoader, this.#gaplessPrebufLoader] = [
						this.#gaplessPrebufLoader,
						this.#gaplessLoader,
					]
					this.#gaplessPrebufLoader.abort()
					this.#prebufferedTrackId = null
					this.#preBufferingNext = false
					this.duration = track.format?.duration ?? 0
					this.#startCurrentTimeLoop()
					this.#schedulePrebufCheck()
					return
				}

				this.#audio.src = ''
				this.#audioLoader.reset()
				this.#gaplessPrebufLoader.abort()
				this.#prebufferedTrackId = null
				this.#preBufferingNext = false
				this.duration = track.format?.duration ?? 0
				this.#startCurrentTimeLoop()

				void this.#gaplessLoader
					.load(track.directory, track.file, track)
					.then((endTime) => {
						if (gen !== this.#requestId) {
							return
						}
						this.#gaplessTrackEndTime = endTime
						this.#schedulePrebufCheck()
					})
					.catch(() => {
						if (gen !== this.#requestId) {
							return
						}
						this.#usingGapless = false
						this.#stopCurrentTimeLoop()
						void this.#audioLoader.load(track.directory, track.file)
					})
			} else {
				this.#abortGapless()

				void this.#audioLoader.load(track.directory, track.file).then((result) => {
					if (result.status === 'failed') {
						const name = truncate(track.name, 30)
						const errorMap = {
							'not-found': m.playerAudioErrorNotFound,
							'permission-denied': m.playerAudioErrorPermissionDenied,
							error: m.playerAudioErrorLoadError,
						}

						snackbar({
							message: errorMap[result.reason]({ name }),
							id: 'failed-to-load-audio',
							duration: 10_000,
						})

						prevTrackId = null
						this.#queue.setTrack(-1)
					}
				})
			}
		}

		$effect(() => {
			const track = this.activeTrack

			untrack(() => {
				trackChanged(track)
			})
		})

		// Guarded by loading and gapless mode: prevents play() on an empty/stale src.
		$effect(() => {
			if (this.#audioLoader.loading || this.#usingGapless) {
				return
			}

			const shouldPlay = this.playing

			if (audio.paused === !shouldPlay) {
				return
			}

			if (shouldPlay) {
				void this.equalizer.resumeContext().then(() => audio.play())
			} else {
				void audio.pause()
			}
		})

		// Gapless pause/resume via AudioContext suspend/resume.
		$effect(() => {
			if (!this.#usingGapless) {
				return
			}

			if (this.playing) {
				void this.equalizer.resumeContext()
				this.#startCurrentTimeLoop()
			} else {
				void this.equalizer.audioContext.suspend()
				this.#stopCurrentTimeLoop()
			}
		})

		const syncPlayingFromAudio = () => {
			const audioPlaying = !audio.paused
			if (audioPlaying !== this.playing) {
				this.playing = audioPlaying
			}
		}

		audio.onplay = syncPlayingFromAudio
		audio.onpause = syncPlayingFromAudio

		audio.onended = () => {
			if (this.repeat === 'one') {
				this.seek(0)
				this.togglePlay(true)
				return
			}

			if (
				this.repeat === 'none' &&
				this.#queue.activeTrackIndex === this.#queue.itemsIds.length - 1
			) {
				const trackId = this.#queue.activeTrackId
				if (trackId !== null) {
					this.#savePlayHistory(trackId)
				}

				this.togglePlay(false)
				return
			}

			this.playNext()
		}

		audio.ondurationchange = () => {
			this.duration = audio.duration
		}

		audio.ontimeupdate = throttle(() => {
			this.currentTime = audio.currentTime
		}, 250)

		const setPlaybackRate = () => {
			audio.playbackRate = clamp(
				this.playbackRate,
				PLAYER_PLAYBACK_RATE_MIN,
				PLAYER_PLAYBACK_RATE_MAX,
			)
		}

		audio.onloadedmetadata = () => {
			// Audio change resets playbackRate
			setPlaybackRate()
		}

		$effect(() => {
			setPlaybackRate()
		})

		$effect(() => {
			audio.preservesPitch = this.preservePitch
		})

		$effect(() => {
			// Humans perceive volume logarithmically
			// so we adjust the volume to match that perception
			const k = 0.5
			audio.volume = (this.volume / 100) ** k
		})

		$effect(() => {
			audio.muted = this.muted
		})

		const ms = window.navigator.mediaSession

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
				album: track.album,
				artwork: [
					{
						src: this.artworkSrc ?? fallbackArtworkSrc,
						sizes: '512x512',
					},
				],
			})
		})

		// Done for minification purposes.
		const setAction = ms.setActionHandler.bind(ms)
		setAction('play', () => this.togglePlay(true))
		setAction('pause', () => this.togglePlay(false))
		setAction('previoustrack', this.playPrev)
		setAction('nexttrack', this.playNext)
		setAction('seekbackward', () => {
			if (this.#usingGapless) {
				void this.seek(Math.max(this.currentTime - 10, 0))
			} else {
				audio.currentTime = Math.max(audio.currentTime - 10, 0)
			}
		})
		setAction('seekforward', () => {
			if (this.#usingGapless) {
				void this.seek(Math.min(this.currentTime + 10, this.duration))
			} else {
				audio.currentTime = Math.min(audio.currentTime + 10, audio.duration)
			}
		})
		// TODO. For gapless we will need to handle this manually
		// seekto is handled by AudioElement default behavior
	}

	#savePlayHistory = (trackId: number): void => {
		const playedTime = this.#usingGapless ? this.currentTime : this.#audio.currentTime
		const totalDuration = this.#usingGapless ? this.duration : this.#audio.duration

		const percentageThreshold = 0.5
		const timeThreshold = 30

		const threshold = Math.min(timeThreshold, totalDuration * percentageThreshold)
		if (totalDuration > 0 && playedTime >= threshold) {
			void dbAddToPlayHistory(trackId)
		}
	}

	togglePlay = (force?: boolean): void => {
		if (this.#queue.activeTrackIndex === -1) {
			return
		}

		this.playing = force ?? !this.playing
	}

	playNext = (): void => {
		this.playTrack(this.#queue.getNextIndex())
	}

	playPrev = (): void => {
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
			void this.seek(0)
		} else {
			// Update ui time instantly, but keep audio.currentTime
			// until play history is saved.
			this.currentTime = 0
		}

		this.togglePlay(true)
	}

	async seek(time: number): Promise<void> {
		this.currentTime = time
		if (this.#usingGapless) {
			this.#preBufferingNext = false
			this.#cancelPrebufTimeout()
			this.#requestId += 1
			const gen = this.#requestId

			const endTime = await this.#gaplessLoader.seek(time)
			if (gen !== this.#requestId) {
				return
			}
			this.#gaplessTrackEndTime = endTime
			this.#schedulePrebufCheck()
		} else {
			this.#audio.currentTime = time
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

	#abortGapless(): void {
		this.#gaplessLoader.abort()
		this.#gaplessPrebufLoader.abort()
		this.#stopCurrentTimeLoop()
		this.#usingGapless = false
		this.#preBufferingNext = false
		this.#prebufferedTrackId = null
		this.#cancelPrebufTimeout()
	}

	#cancelPrebufTimeout(): void {
		if (this.#prebufTimeoutId !== null) {
			window.clearTimeout(this.#prebufTimeoutId)
			this.#prebufTimeoutId = null
		}
	}

	#delayFromAudioContext(targetTime: number): number {
		return Math.max(0, (targetTime - this.equalizer.audioContext.currentTime) * 1000)
	}

	#schedulePrebufCheck(): void {
		this.#cancelPrebufTimeout()
		this.#prebufTimeoutId = window.setTimeout(
			() => void this.#checkPreBuffer(),
			this.#delayFromAudioContext(this.#gaplessTrackEndTime - this.#PRE_BUFFER_SECONDS),
		)
	}

	#startCurrentTimeLoop(): void {
		this.#stopCurrentTimeLoop()
		const tick = () => {
			if (!this.#usingGapless) {
				return
			}
			this.currentTime = this.#gaplessLoader.currentTime
			this.#rafId = requestAnimationFrame(tick)
		}
		this.#rafId = requestAnimationFrame(tick)
	}

	#stopCurrentTimeLoop(): void {
		if (this.#rafId !== 0) {
			cancelAnimationFrame(this.#rafId)
			this.#rafId = 0
		}
	}

	readonly #PRE_BUFFER_SECONDS = 10

	async #checkPreBuffer(): Promise<void> {
		if (!this.#usingGapless) {
			return
		}
		if (!this.#main.gaplessPlaybackEnabled) {
			return
		}
		if (this.#preBufferingNext) {
			return
		}
		const timeUntilEnd = this.#gaplessTrackEndTime - this.equalizer.audioContext.currentTime
		if (this.duration <= 0 || timeUntilEnd > this.#PRE_BUFFER_SECONDS) {
			return
		}

		const expectedCurrentTrackId = this.#queue.activeTrackId

		// End of queue, no repeat: schedule stop at track end.
		if (
			this.repeat === 'none' &&
			this.#queue.activeTrackIndex === this.#queue.itemsIds.length - 1
		) {
			this.#preBufferingNext = true
			this.#prebufTimeoutId = window.setTimeout(() => {
				this.#prebufTimeoutId = null
				if (this.#queue.activeTrackId !== expectedCurrentTrackId) {
					return
				}
				const trackId = this.#queue.activeTrackId
				if (trackId !== null) {
					this.#savePlayHistory(trackId)
				}
				this.togglePlay(false)
				this.#preBufferingNext = false
			}, this.#delayFromAudioContext(this.#gaplessTrackEndTime))
			return
		}

		const nextIndex = this.#queue.getNextIndex()
		const nextId = this.#queue.itemsIds[nextIndex]
		if (nextId == null) {
			return
		}

		this.#preBufferingNext = true

		const nextTrack = await Promise.resolve(getLibraryValue('tracks', nextId, true))

		if (!nextTrack) {
			this.#preBufferingNext = false
			return
		}
		if (!this.#usingGapless) {
			this.#preBufferingNext = false
			return
		}
		if (this.#queue.activeTrackId !== expectedCurrentTrackId) {
			this.#preBufferingNext = false
			return
		}
		if (this.#queue.itemsIds[this.#queue.getNextIndex()] !== nextId) {
			this.#preBufferingNext = false
			return
		}

		if (canTrackUseGapless(nextTrack)) {
			this.#prebufferedTrackId = nextId
			const savedEndTime = this.#gaplessTrackEndTime

			void this.#runPrebufLoad(nextTrack, savedEndTime)

			this.#prebufTimeoutId = window.setTimeout(() => {
				this.#prebufTimeoutId = null
				if (this.#queue.activeTrackId !== expectedCurrentTrackId) {
					return
				}
				// trackChanged will detect #prebufferedTrackId and swap loaders
				this.#queue.setTrack(nextIndex)
			}, this.#delayFromAudioContext(savedEndTime))
		} else {
			// Next track can't use gapless — fall back to AudioLoader after current finishes.
			this.#prebufTimeoutId = window.setTimeout(() => {
				this.#prebufTimeoutId = null
				if (this.#queue.activeTrackId !== expectedCurrentTrackId) {
					return
				}
				this.#usingGapless = false
				this.#preBufferingNext = false
				this.#stopCurrentTimeLoop()
				this.#queue.setTrack(nextIndex)
				// The track loading $effect re-runs and picks the AudioLoader path.
			}, this.#delayFromAudioContext(this.#gaplessTrackEndTime))
		}
	}

	async #runPrebufLoad(track: TrackData, scheduleAt: number): Promise<void> {
		try {
			this.#gaplessTrackEndTime = await this.#gaplessPrebufLoader.load(
				track.directory,
				track.file,
				track,
				scheduleAt,
			)
		} catch (error) {
			console.warn('Pre-buffering failed, falling back to normal loading', error)
			this.#prebufferedTrackId = null
			this.#preBufferingNext = false
		}
	}

	addToQueue = this.#queue.addToQueue

	removeFromQueue = this.#queue.removeFromQueue

	moveQueueItem = this.#queue.moveQueueItem

	clearQueue = this.#queue.clearQueue
}
