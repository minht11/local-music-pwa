import { onDatabaseChange } from '$lib/db/events.ts'
import { toShuffledArray } from '$lib/helpers/utils/array.ts'

export interface PlayTrackOptions {
	shuffle?: boolean
}

export class QueueStore {
	shuffle: boolean = $state(false)

	#activeTrackIndex = $state(-1)
	#itemsIdsOriginalOrder = $state<number[]>([])
	#itemsIdsShuffled = $state<number[] | null>(null)

	itemsIds: readonly number[] = $derived(
		this.#itemsIdsShuffled ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder,
	)

	get activeTrackIndex(): number {
		return this.#activeTrackIndex
	}

	get activeTrackId(): number | null {
		return this.itemsIds[this.#activeTrackIndex] ?? null
	}

	get isQueueEmpty(): boolean {
		return this.itemsIds.length === 0
	}

	constructor() {
		onDatabaseChange((changes) => {
			for (const change of changes) {
				if (change.storeName !== 'tracks' || change.operation !== 'delete') {
					continue
				}

				const index = this.itemsIds.indexOf(change.key)
				if (index !== -1) {
					this.#removeByIndex(index, change.key)
				}
			}
		})
	}

	setTrack = (
		trackIndex: number,
		newQueue?: readonly number[],
		options: PlayTrackOptions = {},
	): void => {
		if (newQueue) {
			this.#itemsIdsOriginalOrder = [...newQueue]
			this.shuffle = options.shuffle ?? false

			if (this.shuffle) {
				this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)
			} else {
				this.#itemsIdsShuffled = null
			}
		}

		this.#activeTrackIndex = this.itemsIds.length === 0 ? -1 : options.shuffle ? 0 : trackIndex
	}

	getNextIndex = (): number => {
		const next = this.#activeTrackIndex + 1
		return next >= this.itemsIds.length ? 0 : next
	}

	getPrevIndex = (): number => {
		const prev = this.#activeTrackIndex - 1
		return prev < 0 ? this.itemsIds.length - 1 : prev
	}

	toggleShuffle = (): void => {
		const activeTrackId = this.itemsIds[this.#activeTrackIndex] ?? -1
		this.shuffle = !this.shuffle

		if (this.shuffle) {
			this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)

			const newIndex = this.#itemsIdsShuffled.indexOf(activeTrackId)
			if (newIndex === -1) {
				this.#activeTrackIndex = -1
			} else {
				const displaced = this.#itemsIdsShuffled[0] as number
				this.#itemsIdsShuffled[0] = activeTrackId
				this.#itemsIdsShuffled[newIndex] = displaced
				this.#activeTrackIndex = 0
			}
		} else {
			this.#itemsIdsShuffled = null
			this.#activeTrackIndex = this.#itemsIdsOriginalOrder.indexOf(activeTrackId)
		}
	}

	addToQueue = (trackId: number | readonly number[]): void => {
		const ids: readonly number[] = Array.isArray(trackId) ? trackId : [trackId]
		this.#itemsIdsShuffled?.push(...ids)
		this.#itemsIdsOriginalOrder.push(...ids)

		if (this.#activeTrackIndex === -1) {
			this.#activeTrackIndex = 0
		}
	}

	removeFromQueue = (index: number): void => {
		if (index < 0 || index >= this.itemsIds.length) {
			return
		}

		const trackId = this.itemsIds[index]
		invariant(trackId !== undefined)
		this.#removeByIndex(index, trackId)
	}

	clearQueue = (): void => {
		this.#itemsIdsOriginalOrder = []
		this.#itemsIdsShuffled = null
		this.#activeTrackIndex = -1
	}

	#removeByIndex = (index: number, trackId: number): void => {
		if (this.#itemsIdsShuffled) {
			this.#itemsIdsShuffled.splice(index, 1)
			const originalIndex = this.#itemsIdsOriginalOrder.indexOf(trackId)
			if (originalIndex !== -1) {
				this.#itemsIdsOriginalOrder.splice(originalIndex, 1)
			}
		} else {
			this.#itemsIdsOriginalOrder.splice(index, 1)
		}

		if (index < this.#activeTrackIndex) {
			this.#activeTrackIndex -= 1
		} else if (index === this.#activeTrackIndex) {
			this.#activeTrackIndex = -1
		}
	}
}
