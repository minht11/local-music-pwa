<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	// import { snackbar } from '$lib/components/snackbar/snackbar'
	import TextField from '$lib/components/TextField.svelte'
	import { getDatabase } from '$lib/db/database'
	import { createQuery } from '$lib/db/query/query.ts'
	import { getLibraryItemIds } from '$lib/library/get/ids'
	import { createLibraryItemKeysQuery } from '$lib/library/get/ids-queries'
	// import { dbToggleTrackInPlaylist } from '$lib/library/playlists-actions'
	import { SvelteSet } from 'svelte/reactivity'

	interface Props {
		trackIds: number[]
		onclose: () => void
	}

	const { trackIds }: Props = $props()

	let searchTerm = $state('')

	const playlistsIdsQuery = createLibraryItemKeysQuery('playlists', {
		key: () => [searchTerm],
		fetcher: () =>
			getLibraryItemIds('playlists', {
				sort: 'createdAt',
				order: 'desc',
				searchTerm,
				searchFn: (p, term) => p.name.includes(term),
			}),
	})

	const trackPlaylists = createQuery({
		key: () => trackIds,
		fetcher: async () => {
			const firstTrackId = trackIds.at(0)
			// In case there are multiple track ids, we treat as if there are no items added in the playlist
			if (trackIds.length > 1 || !firstTrackId) {
				return new SvelteSet()
			}

			const db = await getDatabase()
			const items = await db.getAllFromIndex('playlistsTracks', 'trackId', firstTrackId)

			return new SvelteSet(items.map((item) => item.playlistId))
		},
	})

	const isTrackInPlaylist = (playlistId: number) => !!trackPlaylists.value?.has(playlistId)

	// TODO
	const addToPlaylist = async (_playlistId: number) => {
		// try {
		// 	await dbToggleTrackInPlaylist(isTrackInPlaylist(playlistId), playlistId, trackId)
		// } catch (error) {
		// 	snackbar.unexpectedError(error)
		// }
	}
</script>

<!-- <Separator class="my-6" /> -->

<div class="p-4">
	<TextField bind:value={searchTerm} name="search" placeholder={m.librarySearch()} />
</div>

<Separator />
<ScrollContainer class="max-h-100 grow overflow-auto px-2 py-4">
	{#if playlistsIdsQuery.status === 'error'}
		<div class="py-10 text-center">{m.errorUnexpected()}</div>
	{:else if playlistsIdsQuery.status === 'loaded'}
		<PlaylistListContainer
			items={playlistsIdsQuery.value}
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
