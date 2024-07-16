<script lang="ts">
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import { createQuery, defineListQuery } from '$lib/db/db-fast.svelte'
	import { getDB } from '$lib/db/get-db'
	import { getEntityIds } from '$lib/library/general'
	import { addTrackToPlaylistInDatabase } from '$lib/library/playlists.svelte'
	import invariant from 'tiny-invariant'

	interface Props {
		trackId: number
	}

	const { trackId }: Props = $props()

	// TODO. Should use regular query
	const query = defineListQuery(() => 'playlists', {
		key: () => ['playlists'],
		fetcher: () => getEntityIds('playlists', { sort: 'created' }),
	})

	query.hydrate()

	const playlists = $derived(query.value)

	const trackPlaylists = createQuery({
		key: () => ['playlists-track', trackId],
		fetcher: async () => {
			invariant(trackId)

			const db = await getDB()

			// TODO. There should be a way to query only playlist ids directly
			// without needing a map
			const items = await db.getAllFromIndex('playlistsTracks', 'trackId', trackId)

			return items.map((item) => item.playlistId)
		},
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName !== 'playlistsTracks') {
					continue
				}

				if (change.operation === 'add' || change.operation === 'delete') {
					actions.refetch()
				}

				if (change.operation === 'clear-all') {
					actions.refetch()
				}
			}
		},
	})

	$effect(() => {
		console.log('playlists tracks', trackPlaylists.value)
	})

	const addToPlaylist = async (playlistId: number) => {
		console.log('Add', trackId, playlistId)

		invariant(trackId, 'Playlist to edit is not set')

		await addTrackToPlaylistInDatabase(trackId, playlistId)
	}
</script>

<Separator class="mt-24px" />

<ScrollContainer class="overflow-auto grow max-h-400px px-8px py-16px">
	{#if query.value}
		<PlaylistListContainer
			items={playlists}
			onItemClick={(item) => {
				void addToPlaylist(item.playlist.id)
			}}
		>
			{#snippet iconSnippet(playlist)}
				<div
					class={clx(
						'rounded-full border-2 size-24px',
						trackPlaylists.value?.includes(playlist.id) ? 'border-primary' : 'border-neutral',
					)}
				></div>
			{/snippet}
		</PlaylistListContainer>
	{:else}
		Loading or no data TODO
	{/if}
</ScrollContainer>
