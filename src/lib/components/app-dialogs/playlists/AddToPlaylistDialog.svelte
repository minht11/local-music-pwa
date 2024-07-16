<script lang="ts">
	import Separator from '$lib/components/Separator.svelte'
	import Dialog from '$lib/components/dialog/Dialog.svelte'
	import DialogFooter from '$lib/components/dialog/DialogFooter.svelte'
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import AddToPlaylistDialogContent from './AddToPlaylistDialogContent.svelte'

	const main = useMainStore()
</script>

<Dialog
	openAccessor={{
		get: () => main.addTrackToPlaylistDialogOpen,
		close: () => {
			main.addTrackToPlaylistDialogOpen = null
		},
	}}
	title={'Add to playlist'}
>
	{#snippet children({ data: trackId, close })}
		<AddToPlaylistDialogContent {trackId} />

		<Separator />
		<DialogFooter
			buttons={[
				{
					title: m.libraryCreateNewPlaylist(),
					align: 'left',
					type: 'button',
					action: () => {
						main.createNewPlaylistDialogOpen = true
					},
				},
				{
					title: m.libraryCancel(),
				},
			]}
			onclose={close}
		/>
	{/snippet}
</Dialog>
