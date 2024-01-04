import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { useTrack } from '$lib/library/tracks.svelte'
import { PlayerAudio } from './audio.svelte'

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

	#activeTrackIndex = $state(-1)
	#itemsIdsOriginalOrder = $state<number[]>([])
	#itemsIdsShuffled = $state<number[]>([])

	itemsIds = $derived(this.shuffle ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder)

	activeTrack = useTrack(() => this.itemsIds[this.#activeTrackIndex] ?? -1, {
		allowEmpty: true,
	})

	#artwork = createManagedArtwork(() => this.activeTrack?.value?.images?.full)
	artworkSrc = $derived(this.#artwork[0]())

	constructor() {
		$effect(() => {
			const track = this.activeTrack?.value

			if (track) {
				this.#audio.load(track.file)
			} else {
				// TODO. Do not reset while loading
				this.#audio.reset()
			}
		})
	}

	togglePlay = (force?: boolean) => {
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

	playTrack = (trackIndex: number, queue?: readonly number[]) => {
		if (queue) {
			this.#itemsIdsOriginalOrder = [...queue]
		}

		this.#activeTrackIndex = trackIndex
		this.togglePlay(true)
	}

	seek = this.#audio.seek
}
