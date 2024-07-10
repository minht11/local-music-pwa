<script lang="ts">
	import { truncate } from '$lib/helpers/utils'
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import Dialog from '../Dialog.svelte'

	const main = useMainStore()

	const open = {
		get value() {
			return main.removePlaylistDialogOpen !== null
		},
		set value(_: boolean) {
			main.removePlaylistDialogOpen = null
		},
	}
</script>

<Dialog
	bind:open={open.value}
	title={`Are you sure you want to remove "${truncate(main.removePlaylistDialogOpen?.name ?? '', 10)}" playlist?`}
	class="w-400px"
	buttons={[
		{
			title: m.libraryCancel(),
		},
		{
			title: 'Remove',
			type: 'submit',
		},
	]}
	onsubmit={() => {
		console.log('Remove playlist', main.removePlaylistDialogOpen?.id)
	}}
></Dialog>
