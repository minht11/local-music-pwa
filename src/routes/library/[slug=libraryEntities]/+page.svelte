<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { usePlayer } from '$lib/stores/player/store.ts'
	import Menu, { getMenuId } from '$lib/components/Menu.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'

	const { data } = $props()

	const { store } = data

	store.mountSetup()

	const player = usePlayer()
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

<div class="ml-auto flex gap-8px w-max items-center">
	<button
		popovertarget={menuId}
		use:ripple
		class="flex interactable w-96px border border-solid border-outlineVariant rounded-8px h-40px pl-12px pr-4px gap-4px items-center text-label-md"
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
</div>

<TracksListContainer
	items={data.store.data}
	onItemClick={({ items, index }) => {
		player.playTrack(index, items)
	}}
/>
