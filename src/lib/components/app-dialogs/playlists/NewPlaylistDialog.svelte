<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { createPlaylist } from '$lib/library/playlists-actions.ts'

	const dialogs = useDialogsStore()

	const onSubmitHandler = async (event: SubmitEvent) => {
		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string
		const description = formData.get('description') as string

		await createPlaylist(name, description)

		dialogs.createNewPlaylistDialogOpen = false
	}
</script>

<CommonDialog
	bind:open={dialogs.createNewPlaylistDialogOpen}
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
	<TextField
		name="name"
		placeholder={m.libraryPlaylistName()}
		required
		minLength={4}
		maxLength={40}
	/>

	<TextField name="description" placeholder={m.description()} maxLength={200} class="mt-6" />
</CommonDialog>
