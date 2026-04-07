<script lang="ts">
	import { createBookmarksQuery } from '../bookmarks.ts'
	import BookmarkListItem from '../components/BookmarkListItem.svelte'
	import PlayLaterCard from '../components/PlayLaterCard.svelte'

	interface Props {
		searchTerm: string
	}

	const { searchTerm }: Props = $props()

	const bookmarksQuery = createBookmarksQuery(() => searchTerm)
	const bookmarks = $derived(bookmarksQuery.value ?? [])
</script>

<div class="flex grow flex-col pb-4">
	<div class="flex grow flex-col gap-4">
		<PlayLaterCard />

		{#if bookmarks.length === 0}
			<div class="rounded-2xl border border-dashed border-outlineVariant px-4 py-8 text-center text-onSurfaceVariant">
				No bookmarks yet.
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#each bookmarks as bookmark (bookmark.id)}
					<BookmarkListItem {bookmark} />
				{/each}
			</div>
		{/if}
	</div>
</div>
