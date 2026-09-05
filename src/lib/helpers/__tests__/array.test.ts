import { describe, expect, it } from 'vitest'
import { toShuffledArray } from '$lib/helpers/utils/array.ts'

describe('toShuffledArray', () => {
	it('filters before shuffling when given a predicate', () => {
		const input = [1, 2, 3, 4]
		const output = toShuffledArray(input, (item) => item % 2 === 0)

		expect(output.toSorted()).toEqual([2, 4])
		expect(input).toEqual([1, 2, 3, 4])
	})
})
