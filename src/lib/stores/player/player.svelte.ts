import { listenForDatabaseChanges } from '$lib/db/channel'
import { type TrackData, createTrackQuery } from '$lib/db/entity.ts'
import type { QueryResult } from '$lib/db/query.svelte.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { shuffleArray } from '$lib/helpers/utils/array.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { throttle } from '$lib/helpers/utils/throttle.ts'
import { untrack } from 'svelte'
import { cleanupTrackAudio, loadTrackAudio } from './audio.ts'

export interface PlayTrackOptions {
	shuffle?: boolean
}

export type PlayerRepeat = 'none' | 'one' | 'all'

export class PlayerStore {
	#main = useMainStore()

	#audio = new Audio()

	shuffle: boolean = $state(false)

	repeat: PlayerRepeat = $state('none')

	playing: boolean = $state(false)

	currentTime: number = $state(0)

	duration: number = $state(0)

	#volume = $state(100)

	get volume() {
		if (!this.#main.volumeSliderEnabled) {
			return 100
		}

		return this.#volume
	}

	set volume(value: number) {
		this.#volume = value
	}

	muted: boolean = $state(false)

	get isQueueEmpty(): boolean {
		return this.itemsIds.length === 0
	}

	#activeTrackIndex = $state(-1)
	#itemsIdsOriginalOrder = $state<number[]>([])
	#itemsIdsShuffled = $state<number[]>([])

	itemsIds: number[] = $derived(
		this.shuffle ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder,
	)

	activeTrackQuery: QueryResult<TrackData | undefined, undefined> = createTrackQuery(
		() => this.itemsIds[this.#activeTrackIndex] ?? -1,
		{
			allowEmpty: true,
		},
	)

	activeTrack: TrackData | undefined = $derived(this.activeTrackQuery.value)

	get activeTrackIndex(): number {
		return this.#activeTrackIndex
	}

	#artwork = createManagedArtwork(() => this.activeTrack?.image?.full)
	artworkSrc: string = $derived.by(this.#artwork)

	constructor() {
		persist('player', this, ['volume', 'shuffle', 'repeat', 'muted'])

		const audio = this.#audio

		$effect(() => {
			// If audio state matches our state
			// we do not need to do anything
			if (audio.paused === !this.playing) {
				return
			}

			void audio[this.playing ? 'play' : 'pause']()
		})

		const onAudioPlayPauseHandler = () => {
			const currentAudioState = !audio.paused

			if (currentAudioState !== this.playing) {
				// If our state is out of sync with audio element, sync it.
				this.playing = currentAudioState
			}
		}

		audio.onended = () => {
			if (this.repeat === 'one') {
				this.playTrack(this.#activeTrackIndex)

				return
			}

			if (this.repeat === 'none' && this.#activeTrackIndex === this.itemsIds.length - 1) {
				return
			}

			this.playNext()
		}

		audio.onpause = onAudioPlayPauseHandler
		audio.onplay = onAudioPlayPauseHandler

		audio.ondurationchange = () => {
			this.duration = audio.duration
		}

		audio.ontimeupdate = throttle(() => {
			this.currentTime = audio.currentTime
		}, 1000)

		$effect(() => {
			// Humans perceive volume logarithmically
			// so we adjust the volume to match that perception
			const k = 0.5
			audio.volume = (this.volume / 100) ** k
		})

		const reset = debounce(() => {
			if (!this.activeTrack) {
				this.reset()
			}
		}, 100)

		let prevTrackId: number | null = null
		$effect(() => {
			const track = this.activeTrack

			if (track) {
				if (prevTrackId === track.id) {
					return
				}

				prevTrackId = track.id

				reset.cancel()
				void loadTrackAudio(this.#audio, track.file)
			} else {
				untrack(() => {
					this.playing = false
				})
				reset()

				prevTrackId = null
			}
		})

		listenForDatabaseChanges((changes) => {
			for (const change of changes) {
				if (change.storeName !== 'tracks') {
					continue
				}

				if (change.operation === 'delete') {
					const index = this.itemsIds.indexOf(change.key)

					if (index === -1) {
						continue
					}

					if (index < this.#activeTrackIndex) {
						this.#activeTrackIndex -= 1
					} else if (index === this.#activeTrackIndex) {
						this.#activeTrackIndex = -1
					}

					if (this.shuffle) {
						this.#itemsIdsShuffled.splice(index, 1)
					} else {
						this.#itemsIdsOriginalOrder.splice(index, 1)
					}
				}
			}
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
				artist: track.artists.join(', '),
				album: track.album,
				artwork: [
					// TODO. This does not work with empty artwork, because it is svg in dom,
					// but maybe that's fine
					{ src: this.artworkSrc, sizes: '512x512', type: 'image/jpeg' },
				],
			})
		})

		// Done for minification purposes.
		const setActionHandler = ms.setActionHandler.bind(ms)
		setActionHandler('play', this.togglePlay.bind(null, true))
		setActionHandler('pause', this.togglePlay.bind(null, false))
		setActionHandler('previoustrack', this.playPrev)
		setActionHandler('nexttrack', this.playNext)
		setActionHandler('seekbackward', () => {
			audio.currentTime = Math.min(audio.currentTime - 10, 0)
		})
		setActionHandler('seekforward', () => {
			audio.currentTime = Math.max(audio.currentTime + 10, audio.duration)
		})
	}

	togglePlay = (force?: boolean): void => {
		if (!this.activeTrack) {
			return
		}

		this.playing = force ?? !this.playing
	}

	playNext = (): void => {
		let newIndex = this.#activeTrackIndex + 1
		if (newIndex >= this.itemsIds.length) {
			newIndex = 0
		}

		this.playTrack(newIndex)
	}

	playPrev = (): void => {
		let newIndex = this.#activeTrackIndex - 1
		if (newIndex < 0) {
			newIndex = this.itemsIds.length - 1
		}

		this.playTrack(newIndex)
	}

	playTrack = (
		trackIndex: number,
		queue?: readonly number[],
		options: PlayTrackOptions = {},
	): void => {
		if (queue) {
			this.#itemsIdsOriginalOrder = [...queue]
		}

		if (this.itemsIds.length === 0) {
			return
		}

		if (options.shuffle) {
			const items = [...this.#itemsIdsOriginalOrder]
			shuffleArray(items)

			this.#itemsIdsShuffled = items
			this.shuffle = false
		}

		this.#activeTrackIndex = trackIndex
		this.currentTime = 0
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

	toggleShuffle = (): void => {
		this.shuffle = !this.shuffle

		if (this.shuffle) {
			this.#itemsIdsShuffled = [...this.#itemsIdsOriginalOrder]
			shuffleArray(this.#itemsIdsShuffled)
			// TODO. Need to adjust active track index
		} else {
			this.#itemsIdsShuffled = []
		}
	}

	addToQueue = (trackId: number): void => {
		if (this.shuffle) {
			this.#itemsIdsShuffled.push(trackId)
		}

		this.#itemsIdsOriginalOrder.push(trackId)
	}

	clearQueue = (): void => {
		this.#itemsIdsOriginalOrder = []
		this.#itemsIdsShuffled = []
		this.#activeTrackIndex = -1
	}

	reset = (): void => {
		if (!this.#audio.src) {
			return
		}

		cleanupTrackAudio(this.#audio)
		this.#audio.src = ''
		this.currentTime = 0
		this.duration = 0
	}
}
