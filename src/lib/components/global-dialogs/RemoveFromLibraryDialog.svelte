<script lang="ts" module>
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { createUIAction } from '$lib/helpers/ui-action'
	import { truncate } from '$lib/helpers/utils/text.ts'
	import { dbRemovePlaylist } from '$lib/library/playlists-actions.ts'
	import { dbRemoveAlbum, dbRemoveArtist, dbRemoveTracks } from '$lib/library/remove.ts'
	import type { LibraryStoreName } from '$lib/library/types'
	import type { DialogOpenAccessor } from '../dialog/Dialog.svelte'

	type RemoveLibraryItemOptions =
		| {
				type: 'single'
				id: number
				name: string
				storeName: LibraryStoreName
		  }
		| {
				type: 'multiple'
				ids: readonly number[]
				storeName: 'tracks'
		  }

	export interface RemoveFromLibraryDialogProps {
		open: DialogOpenAccessor<RemoveLibraryItemOptions>
	}
</script>

<script lang="ts">
	let { open }: RemoveFromLibraryDialogProps = $props()

	const removeSingle = createUIAction({
		action: (store: LibraryStoreName, id: number) => {
			switch (store) {
				case 'playlists':
					return dbRemovePlaylist(id)
				case 'tracks':
					return dbRemoveTracks([id])
				case 'albums':
					return dbRemoveAlbum(id)
				case 'artists':
					return dbRemoveArtist(id)
			}
		},
		successMessage: m.libraryItemRemovedFromLibrary(),
	})

	const removeMultipleTracks = createUIAction({
		action: dbRemoveTracks,
		successMessage: m.libraryItemsRemovedFromLibrary(),
	})
</script>

<CommonDialog
	{open}
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
			title: m.libraryRemove(),
			type: 'submit',
		},
	]}
	onsubmit={(_, data) => {
		open.close()

		if (data.type === 'multiple') {
			void removeMultipleTracks(data.ids)
			return
		}

		void removeSingle(data.storeName, data.id)
	}}
/>
