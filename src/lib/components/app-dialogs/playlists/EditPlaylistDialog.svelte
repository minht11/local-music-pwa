<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { updatePlaylist } from '$lib/library/playlists-actions'

	const dialogs = useDialogsStore()
	const data = $derived(dialogs.editPlaylistDialogOpen)

	const submitHandler = async (event: SubmitEvent) => {
		invariant(data !== null, 'Playlist to edit is not set')

		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string
		const description = formData.get('description') as string

		const success = await updatePlaylist({
			id: data.id,
			name,
			description,
		})
		if (success) {
			dialogs.editPlaylistDialogOpen = null
		}
	}
</script>

<CommonDialog
	open={{
		get: () => dialogs.editPlaylistDialogOpen,
		close: () => {
			dialogs.editPlaylistDialogOpen = null
		},
	}}
	icon="addPlaylist"
	title={m.libraryEditPlaylistName()}
	buttons={[
		{
			title: m.libraryCancel(),
		},
		{
			title: m.librarySave(),
			type: 'submit',
		},
	]}
	onsubmit={submitHandler}
>
	<TextField
		value={data?.name}
		name="name"
		placeholder={m.libraryPlaylistName()}
		required
		minLength={4}
		maxLength={40}
	/>

	<TextField
		value={data?.description}
		name="description"
		placeholder={m.description()}
		maxLength={200}
		class="mt-6"
	/>
</CommonDialog>
