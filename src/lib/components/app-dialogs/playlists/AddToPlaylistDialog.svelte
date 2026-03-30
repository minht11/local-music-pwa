<script lang="ts">
	import Dialog from '$lib/components/dialog/Dialog.svelte'
	import DialogFooter from '$lib/components/dialog/DialogFooter.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import AddToPlaylistDialogContent from './AddToPlaylistDialogContent.svelte'

	const dialogs = useDialogsStore()

	const dialogTitle = () => {
		const count = dialogs.addTrackToPlaylistDialogOpen?.length ?? 0
		const countLabel = count > 1 ? ` (${count})` : ''

		return `${m.libraryAddToPlaylist()}${countLabel}`
	}
</script>

<Dialog
	open={{
		get: () => dialogs.addTrackToPlaylistDialogOpen,
		close: () => {
			dialogs.addTrackToPlaylistDialogOpen = null
		},
	}}
	title={dialogTitle()}
>
	{#snippet children({ data: trackIds, close })}
		<svelte:boundary
			onerror={(e) => {
				snackbar.unexpectedError(e)
				queueMicrotask(() => {
					close()
				})
			}}
		>
			<AddToPlaylistDialogContent {trackIds}>
				{#snippet children({ save })}
					<Separator />
					<DialogFooter
						buttons={[
							{
								title: m.libraryCreateNewPlaylist(),
								align: 'left',
								type: 'button',
								action: () => {
									dialogs.createNewPlaylistDialogOpen = true
								},
							},
							{
								title: m.libraryCancel(),
							},
							{
								title: m.librarySave(),
								action: save,
							},
						]}
						onclose={close}
					/>
				{/snippet}
			</AddToPlaylistDialogContent>
		</svelte:boundary>
	{/snippet}
</Dialog>
