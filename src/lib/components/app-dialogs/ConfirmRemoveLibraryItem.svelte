<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { createUIAction } from '$lib/helpers/ui-action'
	import { truncate } from '$lib/helpers/utils/text.ts'
	import { dbRemovePlaylist } from '$lib/library/playlists-actions.ts'
	import { dbRemoveAlbum, dbRemoveArtist, dbRemoveTrack } from '$lib/library/remove.ts'
	import type { LibraryStoreName } from '$lib/library/types'

	const main = useMainStore()

	const remove = createUIAction(
		m.libraryItemRemovedFromLibrary(),
		(store: LibraryStoreName, id: number) => {
			switch (store) {
				case 'playlists':
					return dbRemovePlaylist(id)
				case 'tracks':
					return dbRemoveTrack(id)
				case 'albums':
					return dbRemoveAlbum(id)
				case 'artists':
					return dbRemoveArtist(id)
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
