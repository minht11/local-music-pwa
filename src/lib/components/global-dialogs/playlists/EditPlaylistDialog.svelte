<script lang="ts" module>
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import type { DialogOpenAccessor } from '$lib/components/dialog/Dialog.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { type UpdatePlaylistOptions, updatePlaylist } from '$lib/library/playlists-actions'

	export interface EditPlaylistDialogProps {
		open: DialogOpenAccessor<UpdatePlaylistOptions>
	}
</script>

<script lang="ts">
	let { open }: EditPlaylistDialogProps = $props()

	const submitHandler = async (event: SubmitEvent, data: UpdatePlaylistOptions) => {
		invariant(data !== null, 'Playlist to edit is not set')

		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('playlistName') as string
		const description = formData.get('description') as string

		const success = await updatePlaylist({
			id: data.id,
			name,
			description,
		})

		if (success) {
			open.close()
		}
	}
</script>

<CommonDialog
	{open}
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
	{#snippet children({ data })}
		<TextField
			value={data.name}
			name="playlistName"
			placeholder={m.libraryPlaylistName()}
			required
			minLength={4}
			maxLength={40}
		/>

		<TextField
			value={data.description}
			name="description"
			placeholder={m.description()}
			maxLength={200}
			class="mt-6"
		/>
	{/snippet}
</CommonDialog>
