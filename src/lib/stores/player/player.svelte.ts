import type { QueryResult } from '$lib/db/query/query.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { formatArtists } from '$lib/helpers/utils/text.ts'
import { throttle } from '$lib/helpers/utils/throttle.ts'
import { createTrackQuery, type TrackData } from '$lib/library/get/value-queries.ts'
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'
import { AudioLoader } from './audio-loader.svelte.ts'
import { EqualizerStore } from './equalizer.svelte.ts'
import { type PlayTrackOptions, QueueStore } from './queue.svelte.ts'

export type { PlayTrackOptions }

export type PlayerRepeat = 'none' | 'one' | 'all'

export class PlayerStore {
	readonly #main = useMainStore()

	readonly #audio = new Audio()
	readonly #audioLoader = new AudioLoader((src) => {
		this.#audio.src = src ?? ''
	})
	readonly #queue = new QueueStore()
	readonly equalizer = new EqualizerStore(this.#audio)

	repeat: PlayerRepeat = $state('none')
	playing: boolean = $state(false)
	muted: boolean = $state(false)
	#volume: number = $state(100)

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

	loading: boolean = $derived(this.#audioLoader.loading)

	currentTime: number = $state(0)
	duration: number = $state(0)

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
		persist('player', this, ['volume', 'repeat', 'muted'])
		persist('player', this.#queue, ['shuffle'])

		const audio = this.#audio

		// Plain (non-$state) so reads inside the effect don't create subscriptions.
		let prevTrackId: number | null = null

		// Debounced to recover from transient undefined during a DB refresh.
		const scheduleAudioReset = debounce(() => {
			if (!this.activeTrack) {
				this.#audioLoader.reset()
				this.currentTime = 0
				this.duration = 0
			}
		}, 100)

		$effect(() => {
			const track = this.activeTrack

			if (!track) {
				if (prevTrackId !== null) {
					prevTrackId = null
					untrack(() => {
						this.playing = false
					})
				}
				scheduleAudioReset()
				return
			}

			if (track.id === prevTrackId) {
				return
			}

			scheduleAudioReset.cancel()

			if (prevTrackId !== null) {
				const playedTime = audio.currentTime
				const totalDuration = audio.duration
				untrack(() => {
					invariant(prevTrackId !== null)
					this.#savePlayHistory(prevTrackId, playedTime, totalDuration)
				})
			}

			prevTrackId = track.id
			this.currentTime = 0
			this.duration = 0

			void this.#audioLoader.load(track.file).then((result) => {
				if (result === 'failed') {
					this.playing = false
				}
			})
		})

		// Guarded by loading: prevents play() on an empty/stale src during file fetch.
		$effect(() => {
			if (this.#audioLoader.loading) {
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

		$effect(() => {
			// Humans perceive volume logarithmically
			// so we adjust the volume to match that perception
			const k = 0.5
			audio.volume = (this.volume / 100) ** k
		})

		const ms = window.navigator.mediaSession

		$effect(() => {
			const track = this.activeTrack
			if (!track) {
				ms.metadata = null
				return
			}

			ms.metadata = new MediaMetadata({
				title: track.name,
				artist: formatArtists(track.artists),
				album: track.album,
				artwork: [
					{
						src: this.artworkSrc ?? new URL('/artwork.svg', location.origin).toString(),
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
			audio.currentTime = Math.max(audio.currentTime - 10, 0)
		})
		setAction('seekforward', () => {
			audio.currentTime = Math.min(audio.currentTime + 10, audio.duration)
		})
	}

	#savePlayHistory = (trackId: number, playedTime: number, totalDuration: number): void => {
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
			this.seek(0)
		} else {
			// Update ui time instantly, but keep audio.currentTime
			// until play history is saved.
			this.currentTime = 0
		}

		this.togglePlay(true)
	}

	seek = (time: number): void => {
		this.currentTime = time
		this.#audio.currentTime = time
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

	clearQueue = this.#queue.clearQueue
}
