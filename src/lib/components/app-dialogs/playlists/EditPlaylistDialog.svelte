<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { updatePlaylistName } from '$lib/library/playlists'

	const main = useMainStore()
	const data = $derived(main.editPlaylistDialogOpen)

	const submitHandler = async (event: SubmitEvent) => {
		invariant(data !== null, 'Playlist to edit is not set')

		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string

		const success = await updatePlaylistName(data.id, name)
		if (success) {
			main.editPlaylistDialogOpen = null
		}
	}
</script>

<CommonDialog
	open={{
		get: () => main.editPlaylistDialogOpen,
		close: () => {
			main.editPlaylistDialogOpen = null
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
		placeholder="Playlist name"
		required
		minLength={4}
		maxLength={40}
	/>
</CommonDialog>
