import fc, { type Arbitrary, type Command } from 'fast-check'
import { expect } from 'vitest'
import type {
	QueueEntry,
	QueueLayer,
	QueueOrigin,
	QueueStore,
} from '$lib/stores/player/queue.svelte.ts'
import { createRandom, type ModelItem, type QueueModel, shuffled } from './queue-reference-model.ts'

export interface RealQueue {
	queue: QueueStore
	setMathRandom: (random: () => number) => void
}

type QueueModelView = Pick<QueueModel, 'current' | 'manualUpcoming' | 'source' | 'sourceUpcoming'>

export const actualUpcoming = (queue: QueueStore, layer: QueueLayer): ModelItem[] =>
	Array.from({ length: queue.count(layer) }, (_, index) => {
		const item = queue.itemAt(layer, index)
		invariant(item !== undefined)

		return { entryId: item.entryId, trackId: item.trackId }
	})

const comparableEntry = (entry: QueueEntry | null): QueueEntry | null =>
	entry && { layer: entry.layer, entryId: entry.entryId, trackId: entry.trackId }

const knownEntryIds = (model: QueueModelView): number[] => {
	const ids = [
		...model.manualUpcoming.map((entry) => entry.entryId),
		...model.source.map((entry) => entry.entryId),
	]
	if (model.current?.layer === 'manual') {
		ids.push(model.current.entryId)
	}

	return [...new Set(ids)]
}

const movableEntryIds = (model: QueueModelView): number[] => [
	...model.manualUpcoming.map((entry) => entry.entryId),
	...model.sourceUpcoming.map((entry) => entry.entryId),
]

const assertState = (queue: QueueStore, model: QueueModel, command: string): void => {
	const manual = actualUpcoming(queue, 'manual')
	const source = actualUpcoming(queue, 'source')
	const expectedManual = model.manualUpcoming.map(({ entryId, trackId }) => ({
		entryId,
		trackId,
	}))
	const expectedSource = model.sourceUpcoming.map(({ entryId, trackId }) => ({
		entryId,
		trackId,
	}))

	expect(comparableEntry(queue.current), command).toEqual(model.current)
	expect(manual, command).toEqual(expectedManual)
	expect(source, command).toEqual(expectedSource)
	expect(queue.shuffle, command).toBe(model.shuffle)
	expect(queue.origin, command).toEqual(model.origin)
	expect(model.source.length > 0 || queue.origin === null, command).toBe(true)

	const ids = knownEntryIds(model)
	const totalEntries =
		model.manualUpcoming.length +
		model.source.length +
		(model.current?.layer === 'manual' ? 1 : 0)
	expect(ids.length, command).toBe(totalEntries)
	expect(
		[...manual, ...source].some((entry) => entry.entryId === queue.current?.entryId),
		command,
	).toBe(false)
}

const expectTransition = (
	actual: QueueEntry | null,
	expected: QueueEntry | null,
	command: string,
): void => {
	expect(comparableEntry(actual), command).toEqual(expected)
}

const expectTrackIds = (
	items: readonly ModelItem[],
	expected: readonly number[],
	command: string,
): void => {
	expect(
		items.map((entry) => entry.trackId),
		command,
	).toEqual(expected)
}

interface CommandDefinition<Parameters> {
	weight: number
	arbitrary: Arbitrary<Parameters>
	check?: (parameters: Parameters, model: Readonly<QueueModel>) => boolean
	run: (parameters: Parameters, model: QueueModel, real: RealQueue) => void
	describe: (parameters: Parameters) => string
}

const defineCommand = <Parameters>(
	definition: CommandDefinition<Parameters>,
): { weight: number; arbitrary: Arbitrary<Command<QueueModel, RealQueue>> } => ({
	weight: definition.weight,
	arbitrary: definition.arbitrary.map((parameters) => {
		const description = definition.describe(parameters)

		return {
			check: (model) => definition.check?.(parameters, model) ?? true,
			run: (model, real) => {
				definition.run(parameters, model, real)
				assertState(real.queue, model, description)
			},
			toString: () => description,
		}
	}),
})

const trackId = fc.integer({ min: 0, max: 7 })
const selector = fc.nat({ max: 20 })
const layer = fc.constantFrom<QueueLayer>('manual', 'source')
const shuffleSeed = fc.integer({ min: 1, max: 0x7f_ff_ff_ff })

const setSourceCommand = defineCommand({
	weight: 15,
	arbitrary: fc.record({
		trackIds: fc.array(trackId, { maxLength: 6 }),
		start: fc.constantFrom(-1 as const, 0 as const, 'shuffle' as const),
		originId: fc.option(fc.nat({ max: 20 }), { nil: null }),
		shuffleSeed,
	}),
	run: ({ trackIds, start, originId, shuffleSeed }, model, real) => {
		const origin: QueueOrigin | undefined =
			originId === null ? undefined : { type: 'tracks', name: `source-${originId}` }
		if (start === 'shuffle') {
			real.setMathRandom(createRandom(shuffleSeed))
		}

		const actual = real.queue.setSource(trackIds, start, origin)
		const sourceItems = [
			...(actual?.layer === 'source' ? [actual] : []),
			...actualUpcoming(real.queue, 'source'),
		]
		const permutation =
			start === 'shuffle'
				? shuffled(
						Array.from({ length: trackIds.length }, (_, index) => index),
						createRandom(shuffleSeed),
					)
				: Array.from({ length: trackIds.length }, (_, index) => index)
		const visibleTrackIds = permutation.map((index) => trackIds[index] as number)

		// Entry ids are intentionally opaque. The oracle adopts them only after
		// independently checking the requested track order; direct tests cover id minting.
		expectTrackIds(sourceItems, visibleTrackIds, 'setSource')
		const canonicalItems: ModelItem[] = []
		for (const [orderedIndex, canonicalIndex] of permutation.entries()) {
			const item = sourceItems[orderedIndex]
			invariant(item !== undefined)
			canonicalItems[canonicalIndex] = item
		}

		const expected = model.setSource(
			canonicalItems,
			origin ?? null,
			start,
			start === 'shuffle' ? createRandom(shuffleSeed) : undefined,
		)
		expectTransition(actual, expected, 'setSource')
	},
	describe: ({ trackIds, start, originId, shuffleSeed }) =>
		`setSource(${JSON.stringify(trackIds)}, start=${start}, origin=${originId ?? 'none'}, shuffleSeed=${shuffleSeed})`,
})

const enqueueCommand = defineCommand({
	weight: 20,
	arbitrary: fc.record({
		trackIds: fc.array(trackId, { maxLength: 3 }),
		position: fc.constantFrom('next' as const, 'last' as const),
	}),
	run: ({ trackIds, position }, model, real) => {
		const knownIds = new Set(knownEntryIds(model))
		real.queue.enqueue(trackIds, position)
		const inserted = actualUpcoming(real.queue, 'manual').filter(
			(entry) => !knownIds.has(entry.entryId),
		)
		expectTrackIds(inserted, trackIds, 'enqueue')
		model.enqueue(inserted, position)
	},
	describe: ({ trackIds, position }) => `enqueue(${JSON.stringify(trackIds)}, ${position})`,
})

const advanceCommand = defineCommand({
	weight: 20,
	arbitrary: fc.boolean(),
	run: (loop, model, real) => {
		expectTransition(real.queue.advance(loop), model.advance(loop), 'advance')
	},
	describe: (loop) => `advance(loop=${loop})`,
})

const removeTracksCommand = defineCommand({
	weight: 15,
	arbitrary: fc.array(trackId, { minLength: 1, maxLength: 3 }),
	run: (trackIds, model, real) => {
		real.queue.removeTracks(new Set(trackIds))
		model.removeTracks(new Set(trackIds))
	},
	describe: (trackIds) => `removeTracks(${JSON.stringify(trackIds)})`,
})

const moveEntryCommand = defineCommand({
	weight: 20,
	arbitrary: fc.record({
		selector,
		layer,
		slotSelector: selector,
	}),
	check: (_, model) => movableEntryIds(model).length > 0,
	run: ({ selector, layer, slotSelector }, model, real) => {
		const movable = movableEntryIds(model)
		const entryId = movable[selector % movable.length]
		invariant(entryId !== undefined)
		const slot = slotSelector % (real.queue.count(layer) + 1)
		const toSlot = { layer, slot }
		real.queue.moveEntry(entryId, toSlot)
		model.moveEntry(entryId, toSlot)
	},
	describe: ({ selector, layer, slotSelector }) =>
		`moveEntry(selector=${selector}, to=${layer}:selector(${slotSelector}))`,
})

const toggleShuffleCommand = defineCommand({
	weight: 10,
	arbitrary: shuffleSeed,
	run: (shuffleSeed, model, real) => {
		real.setMathRandom(createRandom(shuffleSeed))
		real.queue.toggleShuffle()
		model.toggleShuffle(createRandom(shuffleSeed))
	},
	describe: (shuffleSeed) => `toggleShuffle(seed=${shuffleSeed})`,
})

const commandArbitrary: Arbitrary<Command<QueueModel, RealQueue>> = fc.oneof(
	setSourceCommand,
	enqueueCommand,
	advanceCommand,
	removeTracksCommand,
	moveEntryCommand,
	toggleShuffleCommand,
)

export const queueCommandSequences = fc.commands<QueueModel, RealQueue>([commandArbitrary], {
	maxCommands: 100,
	size: 'max',
})
