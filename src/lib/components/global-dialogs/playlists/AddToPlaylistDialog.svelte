<script lang="ts" module>
	import Dialog, { type DialogOpenAccessor } from '$lib/components/dialog/Dialog.svelte'
	import DialogFooter from '$lib/components/dialog/DialogFooter.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import AddToPlaylistDialogContent from './AddToPlaylistDialogContent.svelte'

	export interface AddToPlaylistDialogProps {
		open: DialogOpenAccessor<readonly number[]>
	}
</script>

<script lang="ts">
	let { open }: AddToPlaylistDialogProps = $props()

	const dialogs = useDialogsStore()

	const dialogTitle = (tracks: readonly number[]) => {
		const count = tracks.length ?? 0
		const countLabel = count > 1 ? ` (${count})` : ''

		return `${m.libraryAddToPlaylist()}${countLabel}`
	}
</script>

<Dialog {open} title={dialogTitle}>
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
									dialogs.openDialog('newPlaylist')
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
