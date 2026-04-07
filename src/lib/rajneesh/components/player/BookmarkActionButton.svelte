<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { createBookmark } from '$lib/rajneesh/bookmarks/bookmarks.ts'

	const { class: className }: { class?: ClassValue } = $props()

	const main = useMainStore()
	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const saveBookmark = async () => {
		if (!track) {
			return
		}

		try {
			const bookmarkId = await createBookmark({
				trackId: track.id,
				timestampSeconds: player.currentTime,
			})
			main.bookmarkDialogOpen = { bookmarkId }
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<IconButton
	class={className}
	icon="bookmarkOutline"
	tooltip="Save Bookmark"
	ariaLabel="Save Bookmark"
	disabled={!track}
	onclick={() => void saveBookmark()}
/>
