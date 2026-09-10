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

const setup = (initialSize: (index: number) => number, onChange?: Options['onChange']) => {
	let count = $state(3)
	let overscan = $state(0)
	let estimateSize = $state(initialSize)

	// Captured when the scroll element binds, so a scroll can be simulated.
	let notifyOffset: ((offset: number, isScrolling: boolean) => void) | undefined

	let virtualizer!: ReturnType<typeof createVirtualizerBase<Element, Element>>

	cleanup = $effect.root(() => {
		virtualizer = createVirtualizerBase<Element, Element>(() => {
			const options: Options = {
				count,
				overscan,
				estimateSize,
				onChange,
				getScrollElement: () => element,
				observeElementRect: (_i, cb) => {
					cb({ width: 300, height: 500 })
				},
				observeElementOffset: (_i, cb) => {
					notifyOffset = cb
					cb(0, false)
				},
				scrollToFn: () => {},
			}

			return options
		})
	})

	// Stands in for a render: reading the list is what drives the instance, and
	// derivations do no work until something reads them.
	const render = () => {
		flushSync()
		void virtualizer.virtualItems
	}

	render()

	return {
		get totalSize() {
			return virtualizer.totalSize
		},
		get virtualItems() {
			return virtualizer.virtualItems
		},
		setCount: (value: number) => {
			count = value
			render()
		},
		setOverscan: (value: number) => {
			overscan = value
			render()
		},
		setEstimateSize: (value: (index: number) => number) => {
			estimateSize = value
			render()
		},
		scrollTo: (offset: number) => {
			invariant(notifyOffset !== undefined)
			notifyOffset(offset, false)
			render()
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

	// Binding the scroll element notifies partway through applying the options, so
	// this covers the instance calling back while it is being driven.
	it('publishes rows once the scroll element binds', () => {
		const v = setup(() => 10)
		expect(v.virtualItems.map((item) => item.index)).toEqual([0, 1, 2])
	})

	it('publishes a scroll-driven notification', () => {
		const v = setup(() => 10)
		v.setCount(1000)

		v.scrollTo(5000)

		expect(v.virtualItems[0]?.index).toBe(500)
	})

	it('forwards externally raised notifications to the caller', () => {
		const onChange = vi.fn()
		const v = setup(() => 10, onChange)
		v.setCount(1000)

		onChange.mockClear()
		v.scrollTo(5000)

		expect(onChange).toHaveBeenCalled()
	})
})
