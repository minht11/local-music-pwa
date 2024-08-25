<script lang="ts" module>
	import { ripple } from '$lib/actions/ripple'
	import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom'
	import { nanoid } from 'nanoid'
	import Icon from './icon/Icon.svelte'

	export interface SelectProps<T, Key extends keyof T, LabelKey extends keyof T> {
		items: readonly T[]
		key: Key
		labelKey: LabelKey
		selected?: T[Key]
		class?: string
	}
</script>

<script lang="ts" generics="T, const Key extends keyof T, const LabelKey extends keyof T">
	let {
		items,
		key,
		labelKey,
		selected = $bindable(),
		class: className,
	}: SelectProps<T, Key, LabelKey> = $props()

	const selectedItem = $derived(items.find((item) => item[key] === selected))

	const popupId = nanoid()
	let target = $state<HTMLButtonElement | null>(null)
	let popup = $state<HTMLDivElement | null>(null)
	let isOpen = $state(false)

	$effect(() => {
		if (!popup || !target) {
			return
		}

		const updatePosition = async () => {
			if (!popup || !target) {
				return
			}

			const { x, y } = await computePosition(target, popup, {
				placement: 'bottom-start',
				middleware: [flip(), shift()],
			})

			Object.assign(popup.style, {
				left: `${x}px`,
				top: `${y}px`,
				width: `${target.offsetWidth}px`,
			})
		}

		const cleanup = autoUpdate(target, popup, updatePosition)

		return cleanup
	})
</script>

<button
	bind:this={target}
	class={clx(
		'border border-outlineVariant h-40px rounded-4px pl-16px pr-8px gap-8px appearance-none relative overflow-hidden flex items-center',
		className,
	)}
	use:ripple
	role="combobox"
	aria-controls="popupId"
	aria-owns="popupId"
	aria-expanded={isOpen}
	popovertarget={popupId}
>
	{#if selectedItem}
		{selectedItem[labelKey]}
	{:else}
		Select item
	{/if}

	<Icon type="menuDown" class="size-20px ml-auto" />
</button>

<div
	bind:this={popup}
	id={popupId}
	aria-orientation="vertical"
	role="listbox"
	popover="auto"
	class="bg-surfaceContainerHighest py-8px px-0 rounded-4px shadow-xl hidden popover-open:flex flex-col absolute m-0"
	ontoggle={(e) => {
		isOpen = e.newState === 'open'
	}}
>
	{#if isOpen}
		{#each items as item (item[key])}
			<button
				use:ripple
				role="option"
				aria-selected={item[key] === selected}
				class={clx(
					'overflow-hidden relative h-40px px-16px flex items-center w-full',
					item[key] === selected && 'text-primary',
				)}
				onclick={() => {
					selected = item[key]
					popup?.hidePopover()
				}}
			>
				{item[labelKey]}
			</button>
		{/each}
	{/if}
</div>
