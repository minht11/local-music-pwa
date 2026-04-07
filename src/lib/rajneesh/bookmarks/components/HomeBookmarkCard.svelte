<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { formatBookmarkTimestamp, playBookmark, type BookmarkWithTrack } from '../bookmarks.ts'
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
</script>

<div class="flex items-center gap-2 rounded-2xl border border-primary/10 bg-surfaceContainerHigh px-3 py-2">
	<button class="min-w-0 flex-1 text-left" onclick={openEditDialog}>
		<div class="truncate text-body-md text-onSurface">{bookmark.track.name}</div>
		<div class="truncate text-body-sm text-onSurfaceVariant">
			{formatBookmarkTimestamp(bookmark.timestampSeconds)}
			{#if bookmark.note}
				<span class="ml-2">{bookmark.note}</span>
			{/if}
		</div>
	</button>

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
	<IconButton
		icon="play"
		tooltip="Play bookmark"
		ariaLabel="Play bookmark"
		onclick={() => void playBookmark(player, bookmark)}
	/>
</div>
