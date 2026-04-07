<script lang="ts">
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import { createTrackQuery } from '$lib/library/get/value-queries.ts'
	import { formatBookmarkTimestamp, getBookmark, updateBookmark } from '$lib/rajneesh/bookmarks/index.ts'
	import { useMainStore } from '$lib/stores/main/use-store.ts'

	const main = useMainStore()

	const openAccessor = {
		get: () => main.bookmarkDialogOpen,
		close: () => {
			main.bookmarkDialogOpen = null
		},
	}

	const bookmarkId = $derived(main.bookmarkDialogOpen?.bookmarkId ?? -1)

	let loading = $state(false)
	let bookmark = $state<Awaited<ReturnType<typeof getBookmark>>>(undefined)
	let note = $state('')

	const trackQuery = createTrackQuery(() => bookmark?.trackId ?? -1, {
		allowEmpty: true,
	})

	const onSubmitHandler = async () => {
		if (!bookmark?.id) {
			return
		}

		const success = await updateBookmark(bookmark.id, { note })
		if (success) {
			main.bookmarkDialogOpen = null
		}
	}

	$effect(() => {
		const nextBookmarkId = bookmarkId
		if (nextBookmarkId < 0) {
			bookmark = undefined
			note = ''
			loading = false
			return
		}

		loading = true

		void getBookmark(nextBookmarkId)
			.then((value) => {
				if (bookmarkId !== nextBookmarkId) {
					return
				}

				bookmark = value
				note = value?.note ?? ''
			})
			.finally(() => {
				if (bookmarkId === nextBookmarkId) {
					loading = false
				}
			})
	})
</script>

<CommonDialog
	open={openAccessor}
	title="Bookmark"
	showCloseButton
	buttons={[
		{
			title: 'Close',
		},
		{
			title: 'Save',
			type: 'submit',
		},
	]}
	onsubmit={onSubmitHandler}
>
	<div class="flex min-h-0 flex-col gap-4">
		{#if loading}
			<div class="text-body-sm text-onSurfaceVariant">Loading bookmark...</div>
		{:else if bookmark && trackQuery.value}
			<div class="flex flex-col gap-1">
				<div class="text-title-md text-onSurface">{trackQuery.value.album}</div>
				<div class="text-body-sm text-onSurfaceVariant">
					{trackQuery.value.name} • {formatBookmarkTimestamp(bookmark.timestampSeconds)}
				</div>
			</div>

			<label class="flex flex-col gap-2">
				<span class="text-body-sm text-onSurfaceVariant">Note</span>
				<textarea
					bind:value={note}
					name="note"
					rows={4}
					maxLength={280}
					placeholder="Add an optional note"
					class="min-h-28 resize-y rounded-2xl border border-outline bg-transparent px-3 py-3 text-body-md text-onSurface outline-none placeholder:text-onSurfaceVariant focus:border-primary"
				></textarea>
			</label>
		{:else}
			<div class="text-body-sm text-error">This bookmark is no longer available.</div>
		{/if}
	</div>
</CommonDialog>
