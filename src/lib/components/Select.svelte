<script lang="ts" module>
	import { ripple } from '$lib/actions/ripple'
	import { assign } from '$lib/helpers/utils/assign'
	import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom'
	import Icon from './icon/Icon.svelte'

	export interface SelectProps<T, Key extends keyof T, LabelKey extends keyof T> {
		items: readonly T[]
		key: Key
		labelKey: LabelKey
		selected?: T[Key]
		class?: ClassValue
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

	const popupId = crypto.randomUUID()
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

			assign(popup.style, {
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
	class={[
		'relative flex h-10 cursor-pointer appearance-none items-center gap-2 overflow-hidden rounded-sm border border-outlineVariant pr-2 pl-4 transition-[outline-width] duration-150',
		className,
	]}
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

	<Icon type="menuDown" class="ml-auto size-5" />
</button>

<div
	bind:this={popup}
	id={popupId}
	aria-orientation="vertical"
	role="listbox"
	popover="auto"
	class="absolute m-0 hidden flex-col rounded-sm bg-surfaceContainerHighest px-0 py-2 shadow-xl open:flex"
	ontoggle={(e) => {
		isOpen = e.newState === 'open'
	}}
>
	{#each items as item (item[key])}
		<button
			use:ripple
			role="option"
			aria-selected={item[key] === selected}
			class={[
				'interactable flex h-10 w-full cursor-pointer items-center overflow-hidden px-4 -outline-offset-2',
				item[key] === selected && 'text-primary',
			]}
			onclick={() => {
				selected = item[key]
				popup?.hidePopover()
			}}
		>
			{item[labelKey]}
		</button>
	{/each}
</div>

<style>
	[popover]:popover-open {
		opacity: 1;
	}

	[popover] {
		opacity: 0;
		transition-property: opacity, overlay, display;
		transition-duration: 0.2s;
		transition-behavior: allow-discrete;
	}

	@starting-style {
		[popover]:popover-open {
			opacity: 0;
		}
	}
</style>
