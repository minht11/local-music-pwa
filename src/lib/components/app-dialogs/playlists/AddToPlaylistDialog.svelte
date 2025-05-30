<script lang="ts">
	import Dialog from '$lib/components/dialog/Dialog.svelte'
	import DialogFooter from '$lib/components/dialog/DialogFooter.svelte'
	import Separator from '$lib/components/Separator.svelte'

	// import { getLibraryItemIds } from '$lib/library/get/ids'
	// import AddToPlaylistDialogContent from './AddToPlaylistDialogContent.svelte'

	const main = useMainStore()

	// const getData = () => {
	// 	const firstTrackId = trackIds.at(0)
	// 		// In case there are multiple track ids, we treat as if there are no items added in the playlist
	// 		if (trackIds.length > 1 || !firstTrackId) {
	// 			return new SvelteSet()
	// 		}

	// 		const db = await getDatabase()
	// 		const items = await db.getAllFromIndex('playlistsTracks', 'trackId', firstTrackId)
	// }

	// const playlistsPromise = getLibraryItemIds('playlists', { sort: 'createdAt', order: 'desc' })
	// TODO.
</script>

<Dialog
	open={{
		get: () => main.addTrackToPlaylistDialogOpen,
		close: () => {
			main.addTrackToPlaylistDialogOpen = null
		},
	}}
	title={'Add to playlist'}
>
	{#snippet children({ data: trackIds, close })}
		<!-- <AddToPlaylistDialogContent {trackIds} onclose={close} /> -->

		<Separator />
		<DialogFooter
			buttons={[
				{
					title: m.libraryCreateNewPlaylist(),
					align: 'left',
					type: 'button',
					action: () => {
						main.createNewPlaylistDialogOpen = true
					},
				},
				{
					title: m.libraryClose(),
				},
			]}
			onclose={close}
		/>
	{/snippet}
</Dialog>
