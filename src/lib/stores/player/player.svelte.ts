import { listenForDatabaseChanges } from '$lib/db/channel'
import { type TrackData, useTrackData } from '$lib/db/query'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { debounce, shuffleArray } from '$lib/helpers/utils'
import { untrack } from 'svelte'
import { PlayerAudio } from './audio.svelte'

export interface PlayTrackOptions {
	shuffle?: boolean
}

export type PlayerRepeat = 'none' | 'one' | 'all'

export class PlayerStore {
	#audio = new PlayerAudio()

	shuffle: boolean = $state(false)

	repeat: PlayerRepeat = $state('none')

	get playing() {
		return this.#audio.playing
	}

	set playing(value: boolean) {
		this.#audio.playing = value
	}

	get currentTime(): number {
		return this.#audio.time.current
	}

	get duration(): number {
		return this.#audio.time.duration
	}

	get volume() {
		return this.#audio.volume
	}

	set volume(value: number) {
		this.#audio.volume = value
	}

	get isQueueEmpty(): boolean {
		return this.itemsIds.length === 0
	}

	#activeTrackIndex = $state(-1)
	#itemsIdsOriginalOrder = $state<number[]>([])
	#itemsIdsShuffled = $state<number[]>([])

	itemsIds: number[] = $derived(
		this.shuffle ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder,
	)

	activeTrackLoader = useTrackData(() => this.itemsIds[this.#activeTrackIndex] ?? -1, {
		allowEmpty: true,
	})

	activeTrack: TrackData | undefined = $derived(this.activeTrackLoader.value)

	get activeTrackIndex(): number {
		return this.#activeTrackIndex
	}

	#artwork = createManagedArtwork(() => this.activeTrack?.images?.full)
	artworkSrc: string = $derived(this.#artwork())

	constructor() {
		const reset = debounce(() => {
			if (!this.activeTrack) {
				this.#audio.reset()
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
				this.#audio.load(track.file)
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
		this.togglePlay(true)
	}

	seek: (time: number) => void = this.#audio.seek

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
}
