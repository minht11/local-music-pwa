<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { useMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import { formatBookmarkTimestamp } from '$lib/rajneesh/bookmarks/index.ts'
	import type { ResolvedBookmark } from '$lib/rajneesh/bookmarks/types.ts'

	interface Props {
		bookmark: ResolvedBookmark
		showMenu?: boolean
		onPlay: () => void
		onShare: () => void
		onEdit?: () => void
		onDelete?: () => void
	}

	const {
		bookmark,
		showMenu = false,
		onPlay,
		onShare,
		onEdit,
		onDelete,
	}: Props = $props()

	const menu = useMenu()

	const menuItems = $derived.by(() => {
		const items = []

		if (onEdit) {
			items.push({
				label: 'Edit note',
				action: onEdit,
			})
		}

		if (onDelete) {
			items.push({
				label: 'Delete bookmark',
				action: onDelete,
			})
		}

		return items
	})
</script>

<div class="flex items-center gap-2 rounded-2xl border border-primary/8 bg-surfaceContainerHigh px-3 py-2">
	<div class="rounded-xl bg-secondaryContainer px-3 py-2 text-body-sm tabular-nums text-onSecondaryContainer">
		{formatBookmarkTimestamp(bookmark.timestampSeconds)}
	</div>

	<div class="min-w-0 flex-1">
		<div class="truncate text-body-md text-onSurface">{bookmark.discourseName}</div>
		<div class="truncate text-body-sm text-onSurfaceVariant">
			{bookmark.trackName}
			{#if bookmark.note}
				• {bookmark.note}
			{/if}
		</div>
	</div>

	<IconButton
		icon="shareVariant"
		tooltip="Share bookmark"
		class="size-10 rounded-xl bg-surfaceContainerHighest"
		onclick={onShare}
	/>

	{#if showMenu && menuItems.length > 0}
		<IconButton
			icon="moreVertical"
			tooltip="More bookmark actions"
			class="size-10 rounded-xl bg-surfaceContainerHighest"
			onclick={(event) => {
				menu.showFromEvent(event, menuItems, {
					anchor: true,
					preferredAlignment: {
						horizontal: 'right',
						vertical: 'top',
					},
				})
			}}
		/>
	{/if}

	<IconButton
		icon="play"
		tooltip="Play from bookmark"
		class="size-10 rounded-xl bg-secondaryContainer text-onSecondaryContainer"
		onclick={onPlay}
	/>
</div>
