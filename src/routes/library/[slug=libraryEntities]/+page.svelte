<script lang="ts">
	import { useRootLayout } from '$lib/app.js'
	import AlbumsListContainer from '$lib/components/albums/AlbumsListContainer.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import HeaderActions from './HeaderActions.svelte'

	const { data } = $props()

	const { store } = data

	store.hydrateQuery()
	const itemsIds = $derived(store.items)

	const layout = useRootLayout()
	layout.actions = layoutActions
</script>

{#snippet layoutActions()}
	<HeaderActions {data} />
{/snippet}

<div
	class={clx('w-full grow flex flex-col mt-64px', data.isHandHeldDevice ? 'sm:pl-96px' : 'pl-96px')}
>
	{#if store.searchTerm && itemsIds.length === 0}
		<div class="text-body-md w-max m-auto text-onSurfaceVariant">No results found</div>
	{:else if store.storeName === 'tracks'}
		<TracksListContainer items={itemsIds} />
	{:else if store.storeName === 'albums'}
		<AlbumsListContainer items={itemsIds} />
	{/if}
</div>
