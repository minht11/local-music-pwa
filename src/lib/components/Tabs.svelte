<script lang="ts" module>
	import { ripple } from '$lib/attachments/ripple'

	interface Props<T> {
		selectedIndex: number
		items: readonly T[]
		onchange: (item: T, index: number) => void
		text: Snippet<[T]>
		class?: ClassValue
	}
</script>

<script lang="ts" generics="T">
	const { selectedIndex, items, onchange, text, class: className }: Props<T> = $props()
</script>

<div
	style="grid-template-columns: repeat({items.length}, minmax(0, 1fr))"
	class={['grid gap-1 rounded-full bg-surfaceContainerHighest p-1', className]}
	role="tablist"
>
	<span
		inert
		style="transform: translateX(calc((100% + var(--spacing)) * {selectedIndex}));"
		class="col-1 row-1 rounded-full bg-secondaryContainer transition-transform duration-150"
	></span>
	{#each items as item, index}
		<button
			{@attach ripple()}
			type="button"
			style="grid-area: 1/ {index + 1};"
			class="relative min-w-20 cursor-pointer overflow-clip rounded-full px-4 py-2"
			aria-selected={index === selectedIndex}
			role="tab"
			onclick={() => onchange(item, index)}
		>
			{@render text(item)}
		</button>
	{/each}
</div>
