<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte'
	import { defineListQuery } from '$lib/db/db-fast.svelte'
	import { getEntityIds } from '$lib/library/general'
	import { updatePlaylistNameInDatabase } from '$lib/library/playlists.svelte'
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import invariant from 'tiny-invariant'
	import Button from '../Button.svelte'
	import ScrollContainer from '../ScrollContainer.svelte'
	import Separator from '../Separator.svelte'
	import PlaylistListContainer from '../playlists/PlaylistListContainer.svelte'

	const main = useMainStore()

	const data = $derived(main.editPlaylistDialogOpen)

	const open = {
		get value() {
			return main.addTrackToPlaylistDialogOpen !== null
		},
		set value(_: boolean) {
			main.addTrackToPlaylistDialogOpen = null
		},
	}

	const onSubmitHandler = async (event: SubmitEvent) => {
		invariant(data !== null, 'Playlist to edit is not set')

		const formData = new FormData(event.target as HTMLFormElement)
		const name = formData.get('name') as string

		await updatePlaylistNameInDatabase(data.id, name)

		open.value = false
	}

	// TODO. Should use regular query
	const query = defineListQuery(() => 'playlists', {
		key: () => ['playlists'],
		fetcher: () => getEntityIds('playlists', { sort: 'created' }),
	})

	query.hydrate()

	const playlists = $derived(query.value)
</script>

<Dialog
	bind:open={open.value}
	title={'Add to playlist'}
	class="w-400px max-h-600px"
	buttons={[
		{
			title: m.libraryCancel(),
		},
	]}
	onsubmit={onSubmitHandler}
>
	<!--
		TODO. Dialog wraps form by default, but we likely do not need it here.
	 	Check how it impacts accessability.
	-->
	<Button kind="outlined" class="w-full">
		{m.libraryCreateNewPlaylist()}
	</Button>

	<Separator class="my-24px" />

	<ScrollContainer class="overflow-auto h-400px">
		<PlaylistListContainer items={playlists} />
	</ScrollContainer>
</Dialog>
