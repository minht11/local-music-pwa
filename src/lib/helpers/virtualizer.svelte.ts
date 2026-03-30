import { Virtualizer, type VirtualizerOptions } from '@tanstack/virtual-core'

export * from '@tanstack/virtual-core'

export function createVirtualizerBase<
	TScrollElement extends Element | Window,
	TItemElement extends Element,
>(
	options: () => VirtualizerOptions<TScrollElement, TItemElement>,
): Virtualizer<TScrollElement, TItemElement> {
	const instance = new Virtualizer<TScrollElement, TItemElement>(options())

	let virtualItems = $state(instance.getVirtualItems())
	let totalSize = $state(instance.getTotalSize())

	const virtualizer = new Proxy(instance, {
		get(target, prop) {
			switch (prop) {
				case 'getVirtualItems':
					return () => virtualItems
				case 'getTotalSize':
					return () => totalSize
				default:
					return Reflect.get(target, prop)
			}
		},
	})

	$effect(() => {
		const cleanup = untrack(() => {
			const cleanupInner = virtualizer._didMount()

			return cleanupInner
		})

		return cleanup
	})

	$effect(() => {
		const resolvedOptions = options()

		virtualizer.setOptions({
			...resolvedOptions,
			onChange: (instance, sync) => {
				instance._willUpdate()
				virtualItems = instance.getVirtualItems()
				totalSize = instance.getTotalSize()
				resolvedOptions.onChange?.(instance, sync)
			},
		})

		virtualizer.measure()
	})

	return virtualizer
}
