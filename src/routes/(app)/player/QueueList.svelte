<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import EmptyListMessage from './EmptyListMessage.svelte'
	import { createQueueRows } from './queue-rows.svelte.ts'

	const player = usePlayer()
	const queueRows = createQueueRows(player)
</script>

{#snippet queueHeaderRow(index: number)}
	{@const header = queueRows.headerAt(index)}
	<div class="flex h-12 w-full items-center justify-between pl-4">
		<h2 class="text-title-sm text-onSurfaceVariant">{header.title}</h2>

		{#if header.clearTooltip && header.onClear}
			<IconButton tooltip={header.clearTooltip} icon="trayRemove" onclick={header.onClear} />
		{/if}
	</div>
{/snippet}

{#if player.queue.isEmpty}
	<EmptyListMessage title={m.playerQueueEmpty()} />
{:else}
	<TracksListContainer {...queueRows.listProps} customRow={queueHeaderRow} />
{/if}
