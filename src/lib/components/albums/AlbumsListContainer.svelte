<script lang="ts" context="module">
	import { goto } from '$app/navigation'
	import type { Album } from '$lib/db/entities'
	import { safeInteger } from '$lib/helpers/utils/integers.ts'
	import AlbumGridItem from './AlbumGridItem.svelte'

	export interface AlbumItemClick {
		album: Album
		items: number[]
		index: number
	}
</script>

<script lang="ts">
	import VirtualContainer from '../VirtualContainer.svelte'

	interface Props {
		items: number[]
	}

	const { items }: Props = $props()

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
	key={(index) => items[index] as number}
>
	{#snippet children(item)}
		{@const albumId = items[item.index] as number}
		<AlbumGridItem
			{albumId}
			class="virtual-item top-0"
			style="
					left: {item.lane * sizes.width + item.lane * gap}px;
					width: {sizes.width}px;
					height: {item.size - gap}px;
					transform: translateY({item.start}px);
				"
			onclick={() => {
				goto(`/library/albums/${albumId}`)
			}}
		/>
	{/snippet}
</VirtualContainer>
