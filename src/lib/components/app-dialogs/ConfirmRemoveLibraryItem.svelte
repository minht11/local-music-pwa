<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { createUIAction } from '$lib/helpers/ui-action'
	import { truncate } from '$lib/helpers/utils/truncate.ts'
	import { dbRemovePlaylist } from '$lib/library/playlists-actions.ts'
	import { dbRemoveAlbum, dbRemoveArtist, dbRemoveTrack } from '$lib/library/remove.ts'
	import type { LibraryStoreName } from '$lib/library/types'

	const main = useMainStore()

	const remove = createUIAction(
		m.libraryItemRemovedFromLibrary(),
		async (store: LibraryStoreName, id: number) => {
			if (store === 'playlists') {
				await dbRemovePlaylist(id)
			}

			if (store === 'tracks') {
				await dbRemoveTrack(id)
			}

			if (store === 'albums') {
				await dbRemoveAlbum(id)
			}

			if (store === 'artists') {
				await dbRemoveArtist(id)
			}
		},
	)
</script>

<CommonDialog
	open={{
		get: () => main.removeLibraryItemOpen,
		close: () => {
			main.removeLibraryItemOpen = null
		},
	}}
	title={m.libraryConfirmRemoveTitle({
		name: truncate(main.removeLibraryItemOpen?.name ?? '', 10),
	})}
	buttons={[
		{
			title: m.libraryCancel(),
		},
		{
			title: 'Remove',
			type: 'submit',
		},
	]}
	onsubmit={(_, data) => {
		main.removeLibraryItemOpen = null

		void remove(data.storeName, data.id)
	}}
/>
