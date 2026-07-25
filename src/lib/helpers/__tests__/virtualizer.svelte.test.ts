import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVirtualizerBase, type VirtualizerOptions } from '$lib/helpers/virtualizer.svelte.ts'

type Options = VirtualizerOptions<Element, Element>

let cleanup: () => void
let element: HTMLDivElement

beforeEach(() => {
	element = document.createElement('div')
})

afterEach(() => {
	cleanup?.()
})

const setup = (initialSize: (index: number) => number) => {
	let count = $state(3)
	let overscan = $state(0)
	let estimateSize = $state(initialSize)

	let virtualizer!: ReturnType<typeof createVirtualizerBase<Element, Element>>

	cleanup = $effect.root(() => {
		virtualizer = createVirtualizerBase<Element, Element>(() => {
			const options: Options = {
				count,
				overscan,
				estimateSize,
				getScrollElement: () => element,
				observeElementRect: (_i, cb) => {
					cb({ width: 300, height: 500 })
				},
				observeElementOffset: (_i, cb) => {
					cb(0, false)
				},
				scrollToFn: () => {},
			}

			return options
		})
	})

	flushSync()

	return {
		get totalSize() {
			return virtualizer.getTotalSize()
		},
		setCount: (value: number) => {
			count = value
			flushSync()
		},
		setOverscan: (value: number) => {
			overscan = value
			flushSync()
		},
		setEstimateSize: (value: (index: number) => number) => {
			estimateSize = value
			flushSync()
		},
	}
}

describe('createVirtualizerBase', () => {
	it('measures from the initial size function', () => {
		const v = setup(() => 10)
		expect(v.totalSize).toBe(30)
	})

	it('remeasures when the count changes', () => {
		const v = setup(() => 10)
		v.setCount(5)
		expect(v.totalSize).toBe(50)
	})

	it('remeasures when the size function changes', () => {
		const v = setup(() => 10)
		v.setEstimateSize(() => 20)
		expect(v.totalSize).toBe(60)
	})

	it('does not re-run the size probe when an unrelated option changes', () => {
		const estimateSize = vi.fn(() => 10)
		const v = setup(estimateSize)
		expect(v.totalSize).toBe(30)

		const callsAfterInitial = estimateSize.mock.calls.length
		v.setOverscan(5)
		expect(v.totalSize).toBe(30)

		expect(estimateSize.mock.calls.length).toBe(callsAfterInitial)
	})
})
