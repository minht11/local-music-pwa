<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { truncate } from '$lib/helpers/utils/truncate.ts'
	import { removePlaylist } from '$lib/library/playlists-actions'
	import { removeTrack } from '$lib/library/remove.ts'

	const main = useMainStore()
</script>

<CommonDialog
	open={{
		get: () => main.removeLibraryItemOpen,
		close: () => {
			main.removeLibraryItemOpen = null
		},
	}}
	title={`Are you sure you want to remove "${truncate(main.removeLibraryItemOpen?.name ?? '', 10)}" playlist?`}
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
		const { storeName } = data

		if (storeName === 'playlists') {
			void removePlaylist(data.id)
		}

		if (storeName === 'tracks') {
			void removeTrack(data.id)
		}

		if (storeName === 'albums') {
			throw new Error('Not implemented')
		}

		if (storeName === 'artists') {
			throw new Error('Not implemented')
		}
	}}
/>
