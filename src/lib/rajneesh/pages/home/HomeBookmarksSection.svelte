<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import BookmarkCard from '$lib/rajneesh/components/bookmarks/BookmarkCard.svelte'
	import {
		getResolvedBookmarks,
		onBookmarksDataChange,
		playBookmark,
		shareBookmark,
		type ResolvedBookmark,
	} from '$lib/rajneesh/bookmarks/index.ts'
	import { onMount } from 'svelte'

	const player = usePlayer()

	let bookmarks = $state<ResolvedBookmark[]>([])
	const visibleBookmarks = $derived(bookmarks.slice(0, 4))

	const loadBookmarks = async () => {
		bookmarks = await getResolvedBookmarks()
	}

	onMount(() => {
		void loadBookmarks()

		const unsubscribe = onBookmarksDataChange(() => {
			void loadBookmarks()
		})

		return unsubscribe
	})
</script>

{#if visibleBookmarks.length > 0}
	<section class="py-4">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h2 class="text-title-lg">Bookmarks</h2>
			<Button kind="outlined" as="a" href="/library/bookmarks">
				View all
			</Button>
		</div>

		<div class="flex flex-col gap-3">
			{#each visibleBookmarks as bookmark (bookmark.id)}
				<BookmarkCard
					{bookmark}
					onPlay={() => void playBookmark(player, bookmark, true)}
					onShare={() => void shareBookmark(bookmark)}
				/>
			{/each}
		</div>
	</section>
{/if}
