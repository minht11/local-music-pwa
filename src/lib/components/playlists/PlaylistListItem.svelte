<script lang="ts">
	import type { Playlist } from '$lib/db/entities'
	import { usePlaylistData } from '$lib/db/query.ts'
	import type { Snippet } from 'svelte'
	import invariant from 'tiny-invariant'
	import ListItem, { type MenuItem } from '../ListItem.svelte'
	import Icon from '../icon/Icon.svelte'
	import type { IconType } from '../icon/icon-types.ts'

	interface Props {
		playlistId: number
		style?: string
		ariaRowIndex?: number
		active?: boolean
		class?: string
		icon?: Snippet<[Playlist]> | IconType
		menuItems?: (playlist: Playlist) => MenuItem[]
		onclick?: (playlist: Playlist) => void
	}

	const {
		playlistId,
		style,
		active,
		class: className,
		onclick,
		icon = 'playlist',
		ariaRowIndex,
		menuItems,
	}: Props = $props()

	const data = usePlaylistData(playlistId)
	const playlist = $derived(data.value)

	const menuItemsWithItem = $derived(
		menuItems &&
			(() => {
				invariant(playlist)

				return menuItems?.(playlist)
			}),
	)
</script>

<ListItem
	{style}
	menuItems={menuItemsWithItem}
	tabindex={-1}
	class={clx(
		'h-56px text-left',
		active ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant' : '',
		className,
	)}
	ariaLabel={`Play ${playlist?.name}`}
	{ariaRowIndex}
	onclick={() => onclick?.(playlist!)}
>
	<div role="cell" class="track-item grow gap-20px items-center">
		{#if typeof icon === 'function'}
			{#if playlist}
				{@render icon(playlist)}
			{/if}
		{:else}
			<div class="bg-surfaceContainerHigh p-8px rounded-24px text-onSurfaceVariant/54">
				<Icon type={icon} />
			</div>
		{/if}

		{#if data.loading === true}
			<div>
				<div class="h-8px rounded-2px bg-onSurface/10"></div>
			</div>
		{:else if data.error}
			Error loading track
		{:else if playlist}
			<div class="flex flex-col truncate">
				{playlist.name}
			</div>
		{/if}
	</div>
</ListItem>

<style>
	.track-item {
		--grid-cols: auto 1fr;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}
</style>
