<script lang="ts" module>
	import VirtualContainer from '$lib/components/VirtualContainer.svelte'
	import { safeInteger } from '$lib/helpers/utils/integers.ts'
	import LibraryGridItem, {
		type LibraryGridItemType,
		type LibraryItemGridItemProps,
	} from './LibraryGridItem.svelte'

	interface Props<Type extends LibraryGridItemType> {
		type: Type
		items: number[]
		item: LibraryItemGridItemProps<Type>['children']
	}
</script>

<script lang="ts" generics="Type extends LibraryGridItemType">
	const { items, type, item: itemSnippet }: Props<Type> = $props()

	let containerWidth = $state(0)

	const gap = 8

	const sizes = $derived.by(() => {
		const minWidth = containerWidth > 600 ? 180 : 140

		const columns = safeInteger(Math.floor(containerWidth / minWidth), 1)
		const width = safeInteger(Math.floor((containerWidth - gap * (columns - 1)) / columns))

		const height = width + 72

		return {
			width,
			height: height + gap,
			columns,
			heightWithoutGap: height,
		}
	})
</script>

<VirtualContainer
	bind:offsetWidth={containerWidth}
	{gap}
	count={items.length}
	size={sizes.height}
	lanes={sizes.columns}
	key={(index) => `${items[index]}-${index}`}
>
	{#snippet children(item)}
		<LibraryGridItem
			itemId={items[item.index] as number}
			{type}
			style="
				left: {item.lane * sizes.width + item.lane * gap}px;
				width: {sizes.width}px;
				height: {item.size - gap}px;
				transform: translateY({item.start}px);
			"
			class="virtual-item top-0"
		>
			{#snippet children(itemValue)}
				{@render itemSnippet(itemValue)}
			{/snippet}
		</LibraryGridItem>
	{/snippet}
</VirtualContainer>
