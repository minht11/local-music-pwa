<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { createUIAction } from '$lib/helpers/ui-action'
	import { truncate } from '$lib/helpers/utils/text.ts'
	import { dbRemovePlaylist } from '$lib/library/playlists-actions.ts'
	import {
		dbRemoveAlbum,
		dbRemoveArtist,
		dbRemoveMultipleTracks,
		dbRemoveTrack,
	} from '$lib/library/remove.ts'
	import type { LibraryStoreName } from '$lib/library/types'

	const main = useMainStore()

	const removeSingle = createUIAction(
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

	const removeMultiple = createUIAction(
		m.libraryItemsRemovedFromLibrary(),
		(store: LibraryStoreName, ids: readonly number[]) => {
			invariant(store === 'tracks', 'Only tracks can be removed in bulk')

			return dbRemoveMultipleTracks(ids)
		},
	)
</script>

<CommonDialog
	open={{
		get: () => main.removeFromLibraryOpen,
		close: () => {
			main.removeFromLibraryOpen = null
		},
	}}
	title={(data) => {
		if (data.type === 'multiple') {
			return m.libraryConfirmRemoveMultipleTitle({
				count: data.ids.length,
			})
		}

		return m.libraryConfirmRemoveTitle({
			name: truncate(data.name ?? '', 10),
		})
	}}
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
		main.removeFromLibraryOpen = null

		if (data.type === 'multiple') {
			removeMultiple(data.storeName, data.ids)
			return
		}

		void removeSingle(data.storeName, data.id)
	}}
/>
