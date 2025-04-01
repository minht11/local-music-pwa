<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { truncate } from '$lib/helpers/utils/truncate.ts'
	import { removePlaylist } from '$lib/library/playlists-actions'

	const main = useMainStore()
</script>

<CommonDialog
	open={{
		get: () => main.removePlaylistDialogOpen,
		close: () => {
			main.removePlaylistDialogOpen = null
		},
	}}
	title={`Are you sure you want to remove "${truncate(main.removePlaylistDialogOpen?.name ?? '', 10)}" playlist?`}
	buttons={[
		{
			title: m.libraryCancel(),
		},
		{
			title: 'Remove',
			type: 'submit',
		},
	]}
	onsubmit={() => {
		const data = main.removePlaylistDialogOpen
		invariant(data !== null, 'Playlist to remove is not set')

		main.removePlaylistDialogOpen = null
		void removePlaylist(data.id, data.name)
	}}
/>
