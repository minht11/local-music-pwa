<script lang="ts" module>
	import { ripple } from '$lib/attachments/ripple.ts'
	import Icon from './icon/Icon.svelte'

	export interface SelectProps<T, Key extends keyof T, LabelKey extends keyof T> {
		items: readonly T[]
		key: Key
		labelKey: LabelKey
		placeholder?: string
		selected?: T[Key]
		class?: ClassValue
	}
</script>

<script lang="ts" generics="T, const Key extends keyof T, const LabelKey extends keyof T">
	let {
		items,
		key,
		labelKey,
		placeholder,
		selected = $bindable(),
		class: className,
	}: SelectProps<T, Key, LabelKey> = $props()

	const selectedItem = $derived(items.find((item) => item[key] === selected))

	const anchorId = $props.id()
	const anchorName = `--select-anchor-${anchorId}`

	const popupId = crypto.randomUUID()
	let popup = $state<HTMLDivElement | null>(null)
	let isOpen = $state(false)
</script>

<button
	{@attach ripple()}
	style={`anchor-name: ${anchorName};`}
	class={[
		'select-anchor relative flex h-10 cursor-pointer appearance-none items-center gap-2 truncate overflow-hidden rounded-sm border border-outlineVariant pr-2 pl-4 transition-[outline-width] duration-150',
		className,
	]}
	role="combobox"
	aria-controls={popupId}
	aria-owns={popupId}
	aria-expanded={isOpen}
	popovertarget={popupId}
	type="button"
>
	<div class="truncate">
		{#if selectedItem}
			{selectedItem[labelKey]}
		{:else}
			{placeholder}
		{/if}
	</div>

	<Icon type="menuDown" class="ml-auto size-5" />
</button>

<div
	bind:this={popup}
	id={popupId}
	aria-orientation="vertical"
	role="listbox"
	popover="auto"
	style={`position-anchor: ${anchorName};`}
	class="select-popup m-0 hidden flex-col rounded-sm bg-surfaceContainerHighest px-0 py-2 shadow-xl open:flex"
	ontoggle={(e) => {
		isOpen = e.newState === 'open'
	}}
>
	{#each items as item (item[key])}
		<button
			{@attach ripple()}
			role="option"
			aria-selected={item[key] === selected}
			type="button"
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
	.select-popup {
		position-area: bottom center;
		position-try-fallbacks: flip-block;
		width: anchor-size(width);
		transition-property: opacity, overlay, display;
		transition-duration: 0.2s;
		transition-behavior: allow-discrete;
		opacity: 0;
		&:popover-open {
			opacity: 1;
		}
	}

	@starting-style {
		[popover]:popover-open {
			opacity: 0;
		}
	}
</style>
