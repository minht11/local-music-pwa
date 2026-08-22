<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import EmptyListMessage from './EmptyListMessage.svelte'
	import { createQueueRows } from './queue-rows.svelte.ts'

	const player = usePlayer()
	const queueRows = createQueueRows(player)

	/** The exhausted-state labels, keyed by the store-decided status. */
	const exhaustedTitle = $derived.by(() => {
		const status = player.upNextStatus
		switch (status.kind) {
			case 'stops-after':
				return m.playerNothingUpNext()
			case 'repeats-track':
				return m.playerRepeatingTrack()
			case 'repeats-queue':
				return m.playerRepeatingQueue()
			default:
				return undefined
		}
	})
</script>

{#snippet queueHeaderRow(index: number)}
	{@const header = queueRows.headerAt(index)}
	<div class="flex h-12 w-full items-center justify-between pl-4">
		<h2 class="text-title-sm text-onSurfaceVariant">{header.title}</h2>

		<IconButton tooltip={header.clearTooltip} icon="trayRemove" onclick={header.onClear} />
	</div>
{/snippet}

{#if !queueRows.isEmpty}
	<TracksListContainer {...queueRows.listProps} customRow={queueHeaderRow} />
{:else if exhaustedTitle !== undefined}
	<!-- Playing the last track: the queue is exhausted rather than never started. -->
	<EmptyListMessage title={exhaustedTitle} browseAction={false} />
{:else}
	<EmptyListMessage title={m.playerQueueEmpty()} />
{/if}
