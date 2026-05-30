import { onDatabaseChange } from '$lib/db/events.ts'
import { toShuffledArray } from '$lib/helpers/utils/array.ts'

export interface PlayTrackOptions {
	shuffle?: boolean
}

export class QueueStore {
	shuffle: boolean = $state(false)

	#currentIndex = $state(-1)

	#itemsIdsOriginalOrder: number[] = $state([])
	#itemsIdsShuffled: number[] | null = $state(null)

	itemsIds: readonly number[] = $derived(
		this.#itemsIdsShuffled ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder,
	)

	readonly current = $derived.by(() => {
		const index = this.#currentIndex
		const currentTrackId = this.itemsIds[index]

		if (currentTrackId === undefined) {
			return null
		}

		return {
			id: currentTrackId,
			index,
			isLast: index === this.itemsIds.length - 1,
		}
	})

	get isQueueEmpty(): boolean {
		return this.itemsIds.length === 0
	}

	constructor() {
		onDatabaseChange((changes) => {
			for (const change of changes) {
				if (change.storeName !== 'tracks' || change.operation !== 'delete') {
					continue
				}

				// biome-ignore lint/nursery/noUnnecessaryConditions: loop will break conditional itself
				while (true) {
					const index = this.itemsIds.indexOf(change.key)
					if (index === -1) {
						break
					}

					this.#removeByIndex(index, change.key)
				}
			}
		})
	}

	setTrack = (
		trackIndex: number,
		newQueue?: readonly number[],
		options: PlayTrackOptions = {},
	): number | null => {
		if (newQueue) {
			this.#itemsIdsOriginalOrder = [...newQueue]
			this.shuffle = options.shuffle ?? false

			if (this.shuffle) {
				this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)
			} else {
				this.#itemsIdsShuffled = null
			}
		}

		if (this.itemsIds.length === 0) {
			this.#currentIndex = -1
		} else {
			// TODO. This is inconstant add separate method to play shuffled queue.
			this.#currentIndex = options.shuffle ? 0 : trackIndex
		}

		return this.current?.id ?? null
	}

	getNextIndex = (): number => {
		const next = this.#currentIndex + 1
		return next >= this.itemsIds.length ? 0 : next
	}

	getNextTrack = () => {
		const nextIndex = this.getNextIndex()
		const nextTrackId = this.itemsIds[nextIndex]

		if (nextTrackId === undefined) {
			return null
		}

		return { id: nextTrackId, index: nextIndex }
	}

	getPrevIndex = (): number => {
		const prev = this.#currentIndex - 1
		return prev < 0 ? this.itemsIds.length - 1 : prev
	}

	toggleShuffle = (): void => {
		const activeTrackId = this.itemsIds[this.#currentIndex] ?? -1
		this.shuffle = !this.shuffle

		if (this.shuffle) {
			this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)

			const newIndex = this.#itemsIdsShuffled.indexOf(activeTrackId)
			if (newIndex === -1) {
				this.#currentIndex = -1
			} else {
				const displaced = this.#itemsIdsShuffled[0] as number
				this.#itemsIdsShuffled[0] = activeTrackId
				this.#itemsIdsShuffled[newIndex] = displaced
				this.#currentIndex = 0
			}
		} else {
			this.#itemsIdsShuffled = null
			this.#currentIndex = this.#itemsIdsOriginalOrder.indexOf(activeTrackId)
		}
	}

	addToQueue = (trackId: number | readonly number[]): void => {
		const ids: readonly number[] = Array.isArray(trackId) ? trackId : [trackId]
		// Pushing to end of shuffled array is intentional, shuffle only applies when toggled
		this.#itemsIdsShuffled?.push(...ids)
		this.#itemsIdsOriginalOrder.push(...ids)

		if (this.#currentIndex === -1) {
			this.#currentIndex = 0
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
		this.#currentIndex = -1
	}

	moveQueueItem = (fromIndex: number, toIndex: number): void => {
		if (
			fromIndex < 0 ||
			fromIndex >= this.itemsIds.length ||
			toIndex < 0 ||
			toIndex >= this.itemsIds.length ||
			fromIndex === toIndex
		) {
			return
		}

		// Manual reorder uses the currently visible order as source of truth.
		if (this.#itemsIdsShuffled) {
			this.#itemsIdsOriginalOrder = [...this.#itemsIdsShuffled]
			this.#itemsIdsShuffled = null
			this.shuffle = false
		}

		const movedTrackId = this.#itemsIdsOriginalOrder[fromIndex]
		if (movedTrackId === undefined) {
			return
		}

		this.#itemsIdsOriginalOrder.splice(fromIndex, 1)
		this.#itemsIdsOriginalOrder.splice(toIndex, 0, movedTrackId)

		if (this.#currentIndex === fromIndex) {
			this.#currentIndex = toIndex
			return
		}

		if (fromIndex < this.#currentIndex && toIndex >= this.#currentIndex) {
			this.#currentIndex -= 1
			return
		}

		if (fromIndex > this.#currentIndex && toIndex <= this.#currentIndex) {
			this.#currentIndex += 1
		}
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

		if (index < this.#currentIndex) {
			this.#currentIndex -= 1
		} else if (index === this.#currentIndex) {
			this.#currentIndex = -1
		}
	}
}
