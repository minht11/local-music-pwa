<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { createPlaylist } from '$lib/library/playlists-actions.ts'

	const main = useMainStore()

	const onSubmitHandler = async (event: SubmitEvent) => {
		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string

		await createPlaylist(name)

		main.createNewPlaylistDialogOpen = false
	}
</script>

<CommonDialog
	bind:open={main.createNewPlaylistDialogOpen}
	icon="addPlaylist"
	title={m.libraryCreateNewPlaylist()}
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
</CommonDialog>
