<script lang="ts">
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import { createQuery, defineListQuery } from '$lib/db/db-fast.svelte'
	import { getDB } from '$lib/db/get-db'
	import { getEntityIds } from '$lib/library/general'
	import { toggleTrackInPlaylistInDatabase } from '$lib/library/playlists.svelte'
	import { SvelteSet } from 'svelte/reactivity'
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
			const items = await db.getAllFromIndex('playlistsTracks', 'trackId', trackId)

			return new SvelteSet(items.map((item) => item.playlistId))
		},
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName !== 'playlistsTracks') {
					continue
				}

				actions.mutate((prev = new SvelteSet<number>()) => {
					const [playlistId] = change.key

					if (change.operation === 'delete') {
						prev.delete(playlistId)
					} else {
						prev.add(playlistId)
					}

					return prev
				})
			}
		},
	})

	const isTrackInPlaylist = (playlistId: number) => !!trackPlaylists.value?.has(playlistId)

	const addToPlaylist = async (playlistId: number) => {
		invariant(trackId, 'Playlist to edit is not set')

		await toggleTrackInPlaylistInDatabase(isTrackInPlaylist(playlistId), playlistId, trackId)
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
			{#snippet icon(playlist)}
				{@const isInPlaylist = isTrackInPlaylist(playlist.id)}
				<div
					class={clx(
						'rounded-full border-2 size-24px flex items-center justify-center',
						isInPlaylist ? 'border-primary bg-primary text-onPrimary' : 'border-neutral',
					)}
				>
					{#if isInPlaylist}
						<Icon type="check" />
					{/if}
				</div>
			{/snippet}
		</PlaylistListContainer>
	{:else}
		Loading or no data TODO
	{/if}
</ScrollContainer>
