import { listenForDatabaseChanges } from '$lib/db/channel'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { debounce, shuffleArray } from '$lib/helpers/utils'
import { useTrack } from '$lib/library/tracks.svelte'
import { untrack } from 'svelte'
import { PlayerAudio } from './audio.svelte'

export interface PlayTrackOptions {
	shuffle?: boolean
}

export class PlayerStore {
	#audio = new PlayerAudio()

	shuffle = $state(false)

	get playing() {
		return this.#audio.playing
	}

	set playing(value: boolean) {
		this.#audio.playing = value
	}

	get currentTime() {
		return this.#audio.time.current
	}

	get duration() {
		return this.#audio.time.duration
	}

	get volume() {
		return this.#audio.volume
	}

	set volume(value: number) {
		this.#audio.volume = value
	}

	#activeTrackIndex = $state(-1)
	#itemsIdsOriginalOrder = $state<number[]>([])
	#itemsIdsShuffled = $state<number[]>([])

	itemsIds = $derived(this.shuffle ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder)

	activeTrackQuery = useTrack(() => this.itemsIds[this.#activeTrackIndex] ?? -1, {
		allowEmpty: true,
	})

	activeTrack = $derived(this.activeTrackQuery.value)

	get activeTrackIndex() {
		return this.#activeTrackIndex
	}

	#artwork = createManagedArtwork(() => this.activeTrack?.images?.full)
	artworkSrc = $derived(this.#artwork[0]())

	constructor() {
		const reset = debounce(() => {
			if (!this.activeTrack) {
				this.#audio.reset()
			}
		}, 100)

		$effect(() => {
			const track = this.activeTrack

			if (track) {
				reset.cancel()
				this.#audio.load(track.file)
			} else {
				untrack(() => {
					this.playing = false
				})
				reset()
			}
		})

		listenForDatabaseChanges((changes) => {
			for (const change of changes) {
				const id = change.id
				if (change.operation === 'delete' && id !== undefined) {
					const index = this.itemsIds.indexOf(id)

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

	togglePlay = (force?: boolean) => {
		if (!this.activeTrack) {
			return
		}

		this.playing = force ?? !this.playing
	}

	playNext = () => {
		let newIndex = this.#activeTrackIndex + 1
		if (newIndex >= this.itemsIds.length) {
			newIndex = 0
		}

		this.playTrack(newIndex)
	}

	playPrev = () => {
		let newIndex = this.#activeTrackIndex - 1
		if (newIndex < 0) {
			newIndex = this.itemsIds.length - 1
		}

		this.playTrack(newIndex)
	}

	playTrack = (trackIndex: number, queue?: readonly number[], options: PlayTrackOptions = {}) => {
		if (queue) {
			this.#itemsIdsOriginalOrder = [...queue]
		}

		if (this.itemsIds.length === 0) {
			return
		}

		if (options.shuffle) {
			const items = [...this.#itemsIdsOriginalOrder]
			shuffleArray(items)

			this.#itemsIdsOriginalOrder = items
			this.#itemsIdsShuffled = []
			this.shuffle = false
		}

		this.#activeTrackIndex = trackIndex
		this.togglePlay(true)
	}

	seek = this.#audio.seek
}
