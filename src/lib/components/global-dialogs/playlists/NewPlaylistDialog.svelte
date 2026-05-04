<script lang="ts" module>
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import type { DialogOpenAccessor } from '$lib/components/dialog/Dialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { createPlaylist } from '$lib/library/playlists-actions.ts'

	export interface NewPlaylistDialogProps {
		open: DialogOpenAccessor<boolean>
	}
</script>

<script lang="ts">
	let { open }: NewPlaylistDialogProps = $props()

	const onSubmitHandler = async (event: SubmitEvent) => {
		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('playlistName') as string
		const description = formData.get('description') as string

		await createPlaylist(name, description)

		open.close()
	}
</script>

<CommonDialog
	{open}
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
		name="playlistName"
		placeholder={m.libraryPlaylistName()}
		required
		minLength={4}
		maxLength={40}
	/>

	<TextField name="description" placeholder={m.description()} maxLength={200} class="mt-6" />
</CommonDialog>
