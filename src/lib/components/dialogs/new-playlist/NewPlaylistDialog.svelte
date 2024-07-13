<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { createPlaylist } from '$lib/library/playlists.svelte'
	import { useMainStore } from '$lib/stores/main-store.svelte'

	const main = useMainStore()

	const onSubmitHandler = async (event: SubmitEvent) => {
		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string

		// TODO. Add error handling
		await createPlaylist(name)

		main.createNewPlaylistDialogOpen = false
	}
</script>

<Dialog
	bind:open={main.createNewPlaylistDialogOpen}
	icon="addPlaylist"
	title={m.libraryCreateNewPlaylist()}
	class="w-400px"
	buttons={[
		{
			title: m.libraryCancel(),
		},
		{
			title: m.libraryCreate(),
			type: 'submit',
		},
	]}
	onsubmit={onSubmitHandler}
>
	<TextField name="name" placeholder="New playlist name" required minLength={4} maxLength={40} />
</Dialog>
