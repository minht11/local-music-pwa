import { Virtualizer, type VirtualizerOptions } from '@tanstack/virtual-core'

export * from '@tanstack/virtual-core'

export function createVirtualizerBase<
	TScrollElement extends Element | Window,
	TItemElement extends Element,
>(
	options: () => VirtualizerOptions<TScrollElement, TItemElement>,
): Virtualizer<TScrollElement, TItemElement> {
	let version = $state(0)
	// True while one of the derived blocks below drives the instance.
	let syncing = false
	let userOnChange: VirtualizerOptions<TScrollElement, TItemElement>['onChange']

	const handleChange = (
		instance: Virtualizer<TScrollElement, TItemElement>,
		sync: boolean,
	): void => {
		if (syncing) {
			return
		}

		version += 1
		userOnChange?.(instance, sync)
	}

	const initialOptions = options()
	userOnChange = initialOptions.onChange
	// The size function the instance last measured against. `count` and `lanes`
	// are in virtual-core's measurement memo key and invalidate on their own;
	// `estimateSize` is not, so a change to it has to be forced through.
	let measuredEstimateSize = initialOptions.estimateSize

	const instance = new Virtualizer<TScrollElement, TItemElement>({
		...initialOptions,
		onChange: handleChange,
	})

	// Pushes option changes into the instance. `$derived` rather than `$effect` so
	// rendering stays in sync with state changes.
	const optionsSync = $derived.by(() => {
		const resolved = options()
		userOnChange = resolved.onChange

		// `measure()` drops the whole size cache, making the next read run
		// `estimateSize` for every index.
		const sizeChanged = resolved.estimateSize !== measuredEstimateSize
		measuredEstimateSize = resolved.estimateSize

		syncing = true
		try {
			untrack(() => {
				instance.setOptions({ ...resolved, onChange: handleChange })

				if (sizeChanged) {
					instance.measure()
				}
			})
		} finally {
			syncing = false
		}

		// A fresh object each run, so the snapshot below re-derives.
		return {}
	})

	// The consistent snapshot consumers read.
	const snapshot = $derived.by(() => {
		void optionsSync
		void version

		syncing = true
		try {
			instance._willUpdate()

			return {
				virtualItems: instance.getVirtualItems(),
				totalSize: instance.getTotalSize(),
			}
		} finally {
			syncing = false
		}
	})

	const virtualizer = new Proxy(instance, {
		get(target, prop) {
			switch (prop) {
				case 'getVirtualItems':
					return () => snapshot.virtualItems
				case 'getTotalSize':
					return () => snapshot.totalSize
				default:
					return Reflect.get(target, prop)
			}
		},
	})

	$effect(() => {
		const cleanup = untrack(() => virtualizer._didMount())

		return cleanup
	})

	return virtualizer
}
