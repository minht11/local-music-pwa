<script lang="ts">
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar'
	import { getDB } from '$lib/db/get-db'
	import { createListQuery, createQuery } from '$lib/db/query.svelte'
	import { getEntityIds } from '$lib/library/general'
	import { toggleTrackInPlaylistInDatabase } from '$lib/library/playlists.svelte'
	import { SvelteSet } from 'svelte/reactivity'
	import invariant from 'tiny-invariant'

	interface Props {
		trackId: number
		onclose: () => void
	}

	const { trackId, onclose }: Props = $props()

	const query = createListQuery('playlists', {
		key: () => ['playlists'],
		fetcher: () => getEntityIds('playlists', { sort: 'created' }),
		onError: () => {
			snackbar({
				id: 'playlists-loading',
				// TODO: i18n
				message: 'Failed to load playlists',
			})
			onclose()
		},
	})

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

				const [playlistId, modifiedTrackId] = change.key
				if (modifiedTrackId !== trackId) {
					continue
				}

				actions.mutate((prev = new SvelteSet<number>()) => {
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

<Separator class="mt-6" />

<ScrollContainer class="max-h-100 grow overflow-auto px-2 py-4">
	{#if query.status === 'loaded'}
		<PlaylistListContainer
			items={query.value}
			onItemClick={(item) => {
				void addToPlaylist(item.playlist.id)
			}}
		>
			{#snippet icon(playlist)}
				{@const isInPlaylist = isTrackInPlaylist(playlist.id)}
				<div
					class={[
						'flex size-6 items-center justify-center rounded-full border-2',
						isInPlaylist ? 'border-primary bg-primary text-onPrimary' : 'border-neutral',
					]}
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
