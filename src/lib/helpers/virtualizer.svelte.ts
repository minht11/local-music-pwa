import { type VirtualItem, Virtualizer, type VirtualizerOptions } from '@tanstack/virtual-core'

export * from '@tanstack/virtual-core'

interface VirtualizerSnapshot {
	virtualItems: VirtualItem[]
	totalSize: number
}

type VirtualizerInstance = Virtualizer<Element, Element>

export interface ReactiveVirtualizer {
	readonly virtualItems: VirtualItem[]
	readonly totalSize: number
	readonly range: VirtualizerInstance['range']
	readonly scrollToIndex: VirtualizerInstance['scrollToIndex']
}

export function createVirtualizerBase<
	TScrollElement extends Element | Window,
	TItemElement extends Element,
>(options: () => VirtualizerOptions<TScrollElement, TItemElement>): ReactiveVirtualizer {
	const resolvedOptions = $derived(options())

	let version = $state(0)
	let driving = false

	const handleChange = (
		instance: Virtualizer<TScrollElement, TItemElement>,
		sync: boolean,
	): void => {
		if (driving) {
			return
		}

		version += 1
		resolvedOptions.onChange?.(instance, sync)
	}

	const initialOptions = options()
	const instance = new Virtualizer<TScrollElement, TItemElement>({
		...initialOptions,
		onChange: handleChange,
	})

	// `count` and `lanes` are in virtual-core's measurement memo key; `estimateSize`
	// is not, so a change to it has to be forced through.
	let measuredEstimateSize = initialOptions.estimateSize

	/**
	 * Mutates the instance from inside a derivation. `measure()` and `_willUpdate()`
	 * notify synchronously and a derivation may not write state, so those
	 * notifications are dropped and a caller's `onChange` never hears its own edits.
	 */
	const drive = <T>(mutate: () => T): T => {
		driving = true

		try {
			return untrack(mutate)
		} finally {
			driving = false
		}
	}

	/**
	 * Pushes option changes into the instance. At read time rather than in an effect
	 * because async rendering may update the DOM before an effect runs. Separate
	 * from the snapshot so `setOptions` skips the per-scroll-frame `version` bumps.
	 */
	const appliedOptions = $derived.by(() => {
		const resolved = resolvedOptions

		drive(() => {
			const sizeChanged = resolved.estimateSize !== measuredEstimateSize
			measuredEstimateSize = resolved.estimateSize

			instance.setOptions({ ...resolved, onChange: handleChange })

			if (sizeChanged) {
				instance.measure()
			}
		})

		return resolved
	})

	const snapshot: VirtualizerSnapshot = $derived.by(() => {
		// Rerun snapshot when these changes
		void appliedOptions
		void version

		return drive(() => {
			instance._willUpdate()

			return {
				virtualItems: instance.getVirtualItems(),
				totalSize: instance.getTotalSize(),
			}
		})
	})

	$effect(() => {
		const cleanup = untrack(() => instance._didMount())

		return cleanup
	})

	return {
		get virtualItems() {
			return snapshot.virtualItems
		},
		get totalSize() {
			return snapshot.totalSize
		},
		get range() {
			return instance.range
		},
		scrollToIndex: instance.scrollToIndex,
	}
}
