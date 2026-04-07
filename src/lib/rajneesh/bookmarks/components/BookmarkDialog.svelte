<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { createBookmarkQuery, formatBookmarkTimestamp, updateBookmark } from '../bookmarks.ts'

	const main = useMainStore()

	const bookmarkId = $derived(main.bookmarkDialogOpen?.bookmarkId ?? -1)
	const bookmarkQuery = createBookmarkQuery(() => bookmarkId)
	const bookmark = $derived(bookmarkQuery.value)

	let note = $state('')

	$effect(() => {
		if (!bookmark) {
			note = ''
			return
		}

		note = bookmark.note ?? ''
	})
</script>

<CommonDialog
	open={{
		get: () => main.bookmarkDialogOpen,
		close: () => {
			main.bookmarkDialogOpen = null
		},
	}}
	title={bookmark ? `${bookmark.track.name} • ${formatBookmarkTimestamp(bookmark.timestampSeconds)}` : 'Bookmark'}
	showCloseButton
	buttons={[
		{ title: 'Cancel' },
		{
			title: 'Save',
			kind: 'filled',
			action: async () => {
				if (!bookmark) {
					return
				}

				await updateBookmark({
					id: bookmark.id!,
					note,
				})
			},
		},
	]}
	class="sm:[--dialog-width:--spacing(120)]"
>
	{#snippet children()}
		<div class="flex flex-col gap-4 pb-1">
			{#if bookmark}
				<div class="text-body-sm text-onSurfaceVariant">{bookmark.track.album}</div>

				<label class="flex flex-col gap-2">
					<span class="text-body-sm text-onSurfaceVariant">Note</span>
					<textarea
						bind:value={note}
						rows={5}
						placeholder="Add an optional note"
						class="min-h-30 rounded-2xl border border-outlineVariant bg-surface px-4 py-3 text-body-md text-onSurface outline-none focus:border-primary"
					></textarea>
				</label>
			{/if}
		</div>
	{/snippet}
</CommonDialog>
