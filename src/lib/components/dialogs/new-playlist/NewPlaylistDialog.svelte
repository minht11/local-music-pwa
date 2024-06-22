<script>
	import Dialog from '$lib/components/Dialog.svelte'
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import NewPlaylistDialogContent from './NewPlaylistDialogContent.svelte'

	const main = useMainStore()
</script>

<Dialog
	bind:open={main.createNewPlaylistDialogOpen}
	icon="addPlaylist"
	title={m.libraryCreateNewPlaylist()}
	class="w-400px"
	buttons={[
		{
			title: m.libraryCancel(),
			action: () => {
				main.createNewPlaylistDialogOpen = false
			},
		},
		{
			title: m.libraryCreate(),
			action: () => {
				// TODO. Create new playlist
				main.createNewPlaylistDialogOpen = false
			},
		},
	]}
>
	<NewPlaylistDialogContent />
</Dialog>
