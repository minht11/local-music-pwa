import type {
	QueueEntry,
	QueueLayer,
	QueueOrigin,
	QueueSlot,
} from '$lib/stores/player/queue.svelte.ts'

export interface ModelItem {
	entryId: number
	trackId: number
}

interface ModelSourceItem extends ModelItem {
	canonical: number
}

const asQueueEntry = (layer: QueueLayer, item: ModelItem): QueueEntry => ({
	layer,
	entryId: item.entryId,
	trackId: item.trackId,
})

export const shuffled = <T>(items: readonly T[], random: () => number): T[] => {
	const result = [...items]
	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1))
		const item = result[index] as T
		result[index] = result[swapIndex] as T
		result[swapIndex] = item
	}

	return result
}

/** A semantic queue split into the rows already passed and the rows still upcoming. */
export class QueueModel {
	manualUpcoming: ModelItem[] = []
	sourcePlayed: ModelSourceItem[] = []
	sourceUpcoming: ModelSourceItem[] = []
	current: QueueEntry | null = null
	shuffle = false
	origin: QueueOrigin | null = null

	get source(): readonly ModelSourceItem[] {
		return [...this.sourcePlayed, ...this.sourceUpcoming]
	}

	setSource(
		items: readonly ModelItem[],
		origin: QueueOrigin | null,
		start: -1 | 0 | 'shuffle' = 0,
		random?: () => number,
	): QueueEntry | null {
		const canonical = items.map((item, index) => ({ ...item, canonical: index }))
		const visible =
			start === 'shuffle' ? shuffled(canonical, this.#required(random)) : canonical
		const startsPlaying = start !== -1 && visible.length > 0

		this.sourcePlayed = startsPlaying ? [visible[0] as ModelSourceItem] : []
		this.sourceUpcoming = visible.slice(startsPlaying ? 1 : 0)
		this.current = startsPlaying ? asQueueEntry('source', visible[0] as ModelItem) : null
		this.shuffle = start === 'shuffle'
		this.origin = visible.length === 0 ? null : origin

		return this.current
	}

	enqueue(items: readonly ModelItem[], position: 'next' | 'last'): void {
		if (position === 'next') {
			this.manualUpcoming.unshift(...items)
		} else {
			this.manualUpcoming.push(...items)
		}
	}

	advance(loop: boolean): QueueEntry | null {
		const manual = this.manualUpcoming.shift()
		if (manual) {
			this.current = asQueueEntry('manual', manual)

			return this.current
		}

		if (this.sourceUpcoming.length > 0) {
			const source = this.sourceUpcoming.shift()
			invariant(source !== undefined)
			this.sourcePlayed.push(source)
			this.current = asQueueEntry('source', source)

			return this.current
		}

		const source = this.source
		if (!loop || source.length === 0) {
			return null
		}

		const first = source[0]
		invariant(first !== undefined)
		this.sourcePlayed = [first]
		this.sourceUpcoming = source.slice(1)
		this.current = asQueueEntry('source', first)

		return this.current
	}

	removeTracks(trackIds: ReadonlySet<number>): void {
		const manualWasActive = this.current?.layer === 'manual'
		const currentWasDeleted = this.current !== null && trackIds.has(this.current.trackId)

		this.manualUpcoming = this.manualUpcoming.filter((entry) => !trackIds.has(entry.trackId))
		this.sourcePlayed = this.sourcePlayed.filter((entry) => !trackIds.has(entry.trackId))
		this.sourceUpcoming = this.sourceUpcoming.filter((entry) => !trackIds.has(entry.trackId))
		this.#clearOriginWhenSourceIsEmpty()

		if (!currentWasDeleted) {
			return
		}
		if (manualWasActive) {
			this.current = null
			this.advance(false)
		} else {
			this.sourceUpcoming = [...this.sourcePlayed, ...this.sourceUpcoming]
			this.sourcePlayed = []
			this.current = null
		}
	}

	moveEntry(entryId: number, toSlot: QueueSlot): void {
		const manual = this.manualUpcoming
		const manualIndex = manual.findIndex((entry) => entry.entryId === entryId)
		const sourceIndex = this.sourceUpcoming.findIndex((entry) => entry.entryId === entryId)
		const fromLayer: QueueLayer | null =
			manualIndex === -1 ? (sourceIndex === -1 ? null : 'source') : 'manual'
		if (fromLayer === null) {
			return
		}

		const fromIndex = fromLayer === 'manual' ? manualIndex : sourceIndex
		const sameLayer = fromLayer === toSlot.layer
		const slot = sameLayer && toSlot.slot > fromIndex ? toSlot.slot - 1 : toSlot.slot
		if (sameLayer && slot === fromIndex) {
			return
		}

		const item =
			fromLayer === 'manual'
				? this.#removeManualAt(fromIndex)
				: this.sourceUpcoming.splice(fromIndex, 1)[0]
		invariant(item !== undefined)

		if (toSlot.layer === 'manual') {
			this.#insertManual(item, slot)
			this.#clearOriginWhenSourceIsEmpty()

			return
		}

		const at = Math.max(0, Math.min(slot, this.sourceUpcoming.length))
		this.sourceUpcoming.splice(at, 0, { ...item, canonical: 0 })
		this.#commitVisibleSourceOrder()
	}

	toggleShuffle(random: () => number): void {
		const anchor = this.sourcePlayed.at(-1)
		this.shuffle = !this.shuffle

		if (this.shuffle) {
			const source = this.source
			const visible = anchor
				? [
						anchor,
						...shuffled(
							source.filter((entry) => entry.entryId !== anchor.entryId),
							random,
						),
					]
				: shuffled(source, random)
			this.sourcePlayed = anchor ? [anchor] : []
			this.sourceUpcoming = visible.slice(anchor ? 1 : 0)
		} else {
			const source = this.source.toSorted((a, b) => a.canonical - b.canonical)
			const anchorIndex = anchor
				? source.findIndex((entry) => entry.entryId === anchor.entryId)
				: -1
			this.sourcePlayed = source.slice(0, anchorIndex + 1)
			this.sourceUpcoming = source.slice(anchorIndex + 1)
		}
	}

	#removeManualAt(index: number): ModelItem | undefined {
		return this.manualUpcoming.splice(index, 1)[0]
	}

	#insertManual(item: ModelItem, slot: number): void {
		const at = Math.max(0, Math.min(slot, this.manualUpcoming.length))
		this.manualUpcoming.splice(at, 0, item)
	}

	#commitVisibleSourceOrder(): void {
		const playedCount = this.sourcePlayed.length
		const source = this.source.map((entry, canonical) => ({ ...entry, canonical }))
		this.sourcePlayed = source.slice(0, playedCount)
		this.sourceUpcoming = source.slice(playedCount)
		this.shuffle = false
	}

	#clearOriginWhenSourceIsEmpty(): void {
		if (this.source.length === 0) {
			this.origin = null
		}
	}

	#required<T>(value: T | undefined): T {
		invariant(value !== undefined)

		return value
	}
}

export const createRandom = (seed: number): (() => number) => {
	let state = seed >>> 0

	return () => {
		state ^= state << 13
		state ^= state >>> 17
		state ^= state << 5

		return (state >>> 0) / 4_294_967_296
	}
}
