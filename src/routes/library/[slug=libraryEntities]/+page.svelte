<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Menu, { getMenuId } from '$lib/components/Menu.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import AlbumsListContainer from '$lib/components/albums/AlbumsListContainer.svelte'

	const { data } = $props()

	const { store } = data

	const itemsIdsQuery = store.query()
	const itemsIds = $derived(itemsIdsQuery.value ?? [])

	const menuId = getMenuId()

	const menuItems = $derived(
		store.sortOptions.map((option) => ({
			label: option.name,
			selected: store.sortByKey === option.key,
			action: () => {
				store.sortByKey = option.key
			},
		})),
	)
</script>

<!-- 
<div
	class="ml-auto right-8px fixed will-change-transform top-72px bg-surface tonal-elevation-4 rounded-8px z-1 flex gap-8px p-8px items-center mb-16px"
>
	<button
		popovertarget={menuId}
		use:ripple
		class="flex interactable w-96px rounded-8px h-40px pl-12px pr-4px gap-4px items-center text-label-md"
	>
		{store.sortBy?.name}

		<Icon type="menuDown" class="h-16px w-16px ml-auto" />
	</button>

	<IconButton
		onclick={() => {
			if (store.order === 'asc') {
				store.order = 'desc'
			} else {
				store.order = 'asc'
			}
		}}
	>
		<Icon
			type="sortAscending"
			class={clx(
				'[--icon-size:20px] transition-transform',
				store.order === 'desc' && '-rotate-180deg',
			)}
		/>
	</IconButton>

	<Menu id={menuId} items={menuItems} />

	<input
		type="text"
		placeholder="Search your library"
		class="rounded-24px h-40px w-240px px-24px ml-auto placeholder:text-onSurface/54 text-body-md bg-onSecondaryContainer/12 focus:outline-none"
	/>
</div> -->

{#if store.storeName === 'tracks'}
	<TracksListContainer items={itemsIds} />
{:else if store.storeName === 'albums'}
	<AlbumsListContainer
		items={itemsIds}
		onItemClick={() => {
			// player.playTrack(index, items)
		}}
	/>
{/if}
