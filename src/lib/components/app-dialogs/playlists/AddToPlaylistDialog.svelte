<script lang="ts">
	import Dialog from '$lib/components/dialog/Dialog.svelte'
	import DialogFooter from '$lib/components/dialog/DialogFooter.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import AddToPlaylistDialogContent from './AddToPlaylistDialogContent.svelte'

	const main = useMainStore()
</script>

<Dialog
	open={{
		get: () => main.addTrackToPlaylistDialogOpen,
		close: () => {
			main.addTrackToPlaylistDialogOpen = null
		},
	}}
	title={'Add to playlist'}
>
	{#snippet children({ data: trackIds, close })}
		<AddToPlaylistDialogContent {trackIds} onclose={close} />

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
					title: m.libraryClose(),
				},
			]}
			onclose={close}
		/>
	{/snippet}
</Dialog>
