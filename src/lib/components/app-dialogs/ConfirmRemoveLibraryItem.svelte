<script lang="ts" module>
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

	export interface Props {
		open: DialogOpenAccessor<RemoveLibraryItemOptions>
	}
</script>

<script lang="ts">
	let { open }: Props = $props()

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
			void removeMultiple(data.storeName, data.ids)
			return
		}

		void removeSingle(data.storeName, data.id)
	}}
/>
