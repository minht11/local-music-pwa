<script lang="ts">
	import { page } from '$app/state'
	import Icon from '$lib/components/icon/Icon.svelte'
	import {
		deleteBookmark,
		getResolvedBookmarks,
		onBookmarksDataChange,
		playBookmark,
		restoreSharedBookmark,
		shareBookmark,
		type ResolvedBookmark,
	} from '$lib/rajneesh/bookmarks/index.ts'
	import BookmarkCard from '$lib/rajneesh/components/bookmarks/BookmarkCard.svelte'
	import { useMainStore } from '$lib/stores/main/use-store.ts'
	import { usePlayer } from '$lib/stores/player/use-store.ts'
	import { onMount } from 'svelte'

	interface Props {
		searchTerm?: string
		limit?: number
	}

	const { searchTerm = '', limit }: Props = $props()

	const main = useMainStore()
	const player = usePlayer()

	let bookmarks = $state<ResolvedBookmark[]>([])
	let loading = $state(true)
	let lastHandledShareKey = $state('')

	const visibleBookmarks = $derived(limit ? bookmarks.slice(0, limit) : bookmarks)

	const loadBookmarks = async () => {
		loading = true
		bookmarks = await getResolvedBookmarks(searchTerm)
		loading = false
	}

	const editBookmark = (bookmarkId: number) => {
		main.bookmarkDialogOpen = { bookmarkId }
	}

	onMount(() => {
		void loadBookmarks()

		const unsubscribe = onBookmarksDataChange(() => {
			void loadBookmarks()
		})

		return unsubscribe
	})

	$effect(() => {
		searchTerm
		void loadBookmarks()
	})

	$effect(() => {
		const trackId = page.url.searchParams.get('trackId')
		const timestamp = page.url.searchParams.get('timestamp')
		const shareKey = `${trackId ?? ''}:${timestamp ?? ''}`

		if (!trackId || !timestamp || shareKey === lastHandledShareKey) {
			return
		}

		lastHandledShareKey = shareKey
		void restoreSharedBookmark(player, new URL(page.url.toString(), window.location.origin))
	})
</script>

{#if loading}
	<div class="flex grow items-center justify-center py-12 text-body-sm text-onSurfaceVariant">
		Loading bookmarks...
	</div>
{:else if visibleBookmarks.length === 0}
	<div class="flex grow flex-col items-center justify-center gap-3 py-12 text-center">
		<Icon type="bookmark" class="size-12 opacity-50" />
		<div class="text-title-md">No bookmarks yet</div>
		<div class="max-w-80 text-body-sm text-onSurfaceVariant">
			Save a bookmark from the player to keep important moments here.
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-3 pb-4">
		{#each visibleBookmarks as bookmark (bookmark.id)}
			<BookmarkCard
				{bookmark}
				showMenu
				onPlay={() => void playBookmark(player, bookmark, true)}
				onShare={() => void shareBookmark(bookmark)}
				onEdit={() => editBookmark(bookmark.id)}
				onDelete={() => void deleteBookmark(bookmark.id)}
			/>
		{/each}
	</div>
{/if}
