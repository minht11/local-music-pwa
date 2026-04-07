<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import {
		deleteBookmark,
		formatBookmarkTimestamp,
		playBookmark,
		type BookmarkWithTrack,
	} from '../bookmarks.ts'
	import { shareBookmark } from '../share.ts'

	interface Props {
		bookmark: BookmarkWithTrack
	}

	const { bookmark }: Props = $props()

	const main = useMainStore()
	const player = usePlayer()

	const openEditDialog = () => {
		main.bookmarkDialogOpen = { bookmarkId: bookmark.id! }
	}

	const removeBookmark = async () => {
		try {
			await deleteBookmark(bookmark.id!)
			snackbar('Bookmark deleted')
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<div class="flex items-center gap-3 rounded-2xl border border-primary/10 bg-surfaceContainerHigh px-4 py-3">
	<button class="min-w-0 flex-1 text-left" onclick={openEditDialog}>
		<div class="truncate text-body-lg text-onSurface">{bookmark.track.name}</div>
		<div class="text-body-sm text-onSurfaceVariant">
			{formatBookmarkTimestamp(bookmark.timestampSeconds)}
		</div>
		{#if bookmark.note}
			<div class="line-clamp-2 text-body-sm text-onSurfaceVariant">{bookmark.note}</div>
		{/if}
	</button>

	<div class="flex items-center gap-1">
		<IconButton
			icon="shareVariant"
			tooltip="Share bookmark"
			ariaLabel="Share bookmark"
			onclick={() =>
				void shareBookmark({
					trackName: bookmark.track.name,
					trackUuid: bookmark.track.uuid,
					timestampSeconds: bookmark.timestampSeconds,
				})}
		/>
		<IconButton icon="pencil" tooltip="Edit note" ariaLabel="Edit note" onclick={openEditDialog} />
		<IconButton
			icon="trashOutline"
			tooltip="Delete bookmark"
			ariaLabel="Delete bookmark"
			onclick={() => void removeBookmark()}
		/>
		<IconButton
			icon="play"
			tooltip="Play bookmark"
			ariaLabel="Play bookmark"
			onclick={() => void playBookmark(player, bookmark)}
		/>
	</div>
</div>
