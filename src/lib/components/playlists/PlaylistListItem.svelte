<script lang="ts">
	import type { Playlist } from '$lib/db/entities'
	import { usePlaylist } from '$lib/library/tracks.svelte.ts'
	import type { Snippet } from 'svelte'
	import invariant from 'tiny-invariant'
	import ListItem, { type MenuItem } from '../ListItem.svelte'
	import Icon from '../icon/Icon.svelte'

	interface Props {
		playlistId: number
		style?: string
		ariaRowIndex?: number
		active?: boolean
		class?: string
		iconSnippet?: Snippet<[Playlist]>
		menuItems?: (playlist: Playlist) => MenuItem[]
		onclick?: (playlist: Playlist) => void
	}

	const {
		playlistId,
		style,
		active,
		class: className,
		onclick,
		iconSnippet,
		ariaRowIndex,
		menuItems,
	}: Props = $props()

	const data = usePlaylist(playlistId)
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
		{#if playlist && iconSnippet}
			{@render iconSnippet(playlist)}
		{:else}
			<div class="bg-surfaceContainerHigh p-8px rounded-24px text-onSurfaceVariant/54">
				<Icon type="playlist" />
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

<style lang="postcss">
	.track-item {
		--grid-cols: auto 1fr;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}
</style>
