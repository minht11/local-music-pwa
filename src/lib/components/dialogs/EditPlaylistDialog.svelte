<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { updatePlaylistNameInDatabase } from '$lib/library/playlists.svelte'
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import invariant from 'tiny-invariant'

	const main = useMainStore()

	const data = $derived(main.editPlaylistDialogOpen)

	const open = {
		get value() {
			return main.editPlaylistDialogOpen !== null
		},
		set value(_: boolean) {
			main.editPlaylistDialogOpen = null
		},
	}

	const onSubmitHandler = async (event: SubmitEvent) => {
		invariant(data !== null, 'Playlist to edit is not set')

		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string

		await updatePlaylistNameInDatabase(data.id, name)

		open.value = false
	}
</script>

<Dialog
	bind:open={open.value}
	icon="addPlaylist"
	title={m.libraryEditPlaylistName()}
	class="w-400px"
	buttons={[
		{
			title: m.libraryCancel(),
		},
		{
			title: m.librarySave(),
			type: 'submit',
		},
	]}
	onsubmit={onSubmitHandler}
>
	<TextField
		value={data?.name}
		name="name"
		placeholder="Playlist name"
		required
		minLength={4}
		maxLength={40}
	/>
</Dialog>
