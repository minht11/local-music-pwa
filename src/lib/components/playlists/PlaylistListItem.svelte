<script lang="ts" module>
	import type { Playlist } from '$lib/db/database-types'
	import { createPlaylistQuery } from '$lib/db/entity'
	import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte'
	import type { Snippet } from 'svelte'
	import ListItem, { type MenuItem } from '../ListItem.svelte'
	import Icon from '../icon/Icon.svelte'
	import type { IconType } from '../icon/Icon.svelte'

	export type MenuItemsSelector = (playlist: Playlist) => MenuItem[]
	export type MenuItemsConfig =
		| {
				disabled?: (playlist: Playlist) => boolean
				items: MenuItemsSelector
		  }
		| MenuItemsSelector
</script>

<script lang="ts">
	interface Props {
		playlistId: number
		style?: string
		ariaRowIndex?: number
		active?: boolean
		class?: ClassNameValue
		icon?: Snippet<[Playlist]> | IconType
		menuItems?: MenuItemsConfig
		onclick?: (playlist: Playlist) => void
	}

	const {
		playlistId,
		style,
		active,
		class: className,
		onclick,
		icon,
		ariaRowIndex,
		menuItems,
	}: Props = $props()

	const data = createPlaylistQuery(playlistId)
	const playlist = $derived(data.value)

	const menuItemsWithItem = $derived.by(() => {
		if (!playlist) {
			return undefined
		}

		if (typeof menuItems === 'object') {
			return menuItems.disabled?.(playlist) ? undefined : () => menuItems.items(playlist)
		}

		return () => menuItems?.(playlist) ?? []
	})

	const fallbackIcon = () => (playlistId === FAVORITE_PLAYLIST_ID ? 'favorite' : 'playlist')
</script>

<ListItem
	{style}
	menuItems={menuItemsWithItem}
	tabindex={-1}
	class={[
		'h-14 text-left',
		active ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant' : '',
		className,
	]}
	ariaLabel={`Play ${playlist?.name}`}
	{ariaRowIndex}
	onclick={() => onclick?.(playlist!)}
>
	<div role="cell" class="track-item grow items-center gap-5">
		{#if typeof icon === 'function'}
			{#if playlist}
				{@render icon(playlist)}
			{/if}
		{:else}
			<div class="rounded-3xl bg-surfaceContainerHigh p-2 text-onSurfaceVariant/54">
				<Icon type={icon ?? fallbackIcon()} />
			</div>
		{/if}

		{#if data.loading === true}
			<div>
				<div class="h-2 rounded-xs bg-onSurface/10"></div>
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
