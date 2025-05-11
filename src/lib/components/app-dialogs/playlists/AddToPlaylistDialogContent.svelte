<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	// import { snackbar } from '$lib/components/snackbar/snackbar'
	import TextField from '$lib/components/TextField.svelte'
	import { getDatabase } from '$lib/db/database'
	import { createQuery } from '$lib/db/query/query.ts'
	import { getLibraryItemIds } from '$lib/library/get/ids'
	import { createLibraryItemKeysQuery } from '$lib/library/get/ids-queries'
	import type { PlaylistData } from '$lib/library/get/value'
	// import { dbToggleTrackInPlaylist } from '$lib/library/playlists-actions'
	import { SvelteSet } from 'svelte/reactivity'

	interface Props {
		playlists: PlaylistData[]
		trackIds: number[]
		onclose: () => void
	}

	const { trackIds }: Props = $props()

	// const getData = async () => {
	// 	const db = await getDatabase()
	// 	const tx = db.transaction('playlistsTracks')
	// 	const promises = trackIds.map((trackId) => tx.objectStore('playlistsTracks').getAll(trackId))
	// }

	const query = createLibraryItemKeysQuery('playlists', {
		key: ['playlists'],
		fetcher: () => getLibraryItemIds('playlists', { sort: 'createdAt', order: 'desc' }),
	})

	const trackPlaylists = createQuery({
		key: () => ['playlists-track', ...trackIds],
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
	<TextField name="search" placeholder="Search" />
</div>

<ScrollContainer class="max-h-100 grow overflow-auto px-2 py-4">
	{#if query.status === 'error'}
		<div class="py-10 text-center">{m.errorUnexpected()}</div>
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
