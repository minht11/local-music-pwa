<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { createBookmark } from '$lib/rajneesh/bookmarks/index.ts'
	import { useMainStore } from '$lib/stores/main/use-store.ts'
	import { usePlayer } from '$lib/stores/player/use-store.ts'

	const main = useMainStore()
	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const saveBookmark = async () => {
		if (!track) {
			return
		}

		try {
			const bookmarkId = await createBookmark(track.id, player.currentTime)
			main.bookmarkDialogOpen = { bookmarkId }
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<IconButton
	icon="bookmark"
	tooltip="Save bookmark"
	disabled={!track}
	onclick={() => void saveBookmark()}
/>
