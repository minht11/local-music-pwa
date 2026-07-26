<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import EmptyListMessage from './EmptyListMessage.svelte'
	import { createQueueRows } from './queue-rows.svelte.ts'

	const player = usePlayer()
	const queueRows = createQueueRows(player)

	/**
	 * Shown once no rows are left but a track is still playing. Read from
	 * `upNextTrackId` rather than the repeat mode, so the message says what will
	 * actually happen: repeat only wraps when the source queue has tracks to wrap to.
	 */
	const exhaustedTitle = $derived.by(() => {
		if (player.upNextTrackId === null) {
			return m.playerNothingUpNext()
		}

		return player.repeat === 'one' ? m.playerRepeatingTrack() : m.playerRepeatingQueue()
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
{:else if player.queue.current}
	<!-- Playing the last track: the queue is exhausted rather than never started. -->
	<EmptyListMessage title={exhaustedTitle} browseAction={false} />
{:else}
	<EmptyListMessage title={m.playerQueueEmpty()} />
{/if}
