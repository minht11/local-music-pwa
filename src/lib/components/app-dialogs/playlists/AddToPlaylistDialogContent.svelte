<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar'
	import { getDatabase } from '$lib/db/database'
	import { createQuery } from '$lib/db/query/query.ts'
	import { getLibraryItemIds } from '$lib/library/get/keys.ts'
	import { createLibraryItemKeysQuery } from '$lib/library/get/keys-queries.ts'
	import { dbToggleTrackInPlaylist } from '$lib/library/playlists-actions'
	import { SvelteSet } from 'svelte/reactivity'

	interface Props {
		trackId: number
		onclose: () => void
	}

	const { trackId }: Props = $props()

	const query = createLibraryItemKeysQuery('playlists', {
		key: ['playlists'],
		fetcher: () => getLibraryItemIds('playlists', { sort: 'created' }),
	})

	const trackPlaylists = createQuery({
		key: () => ['playlists-track', trackId],
		fetcher: async () => {
			invariant(trackId)

			const db = await getDatabase()
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
		try {
			await dbToggleTrackInPlaylist(isTrackInPlaylist(playlistId), playlistId, trackId)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<Separator class="mt-6" />

<ScrollContainer class="max-h-100 grow overflow-auto px-2 py-4">
	{#if query.status === 'error'}
		<div>Failed to load playlists</div>
	{:else if query.status === 'loaded'}
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
	{/if}
</ScrollContainer>
