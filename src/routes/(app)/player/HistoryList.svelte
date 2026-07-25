<script lang="ts">
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { createTrackIdsSource } from '$lib/components/tracks/track-ids-source.svelte.ts'
	import { dbRemoveFromPlayHistory } from '$lib/library/play-history-actions.ts'
	import EmptyListMessage from './EmptyListMessage.svelte'

	interface Props {
		items: readonly number[]
	}

	const { items }: Props = $props()

	const player = usePlayer()
	// Playing from history jumps to the track wherever it lives; it never replaces
	// the queue with the history list.
	const source = createTrackIdsSource(() => items, {
		onItemClick: ({ track }) => {
			player.playTrackId(track.id)
		},
	})
</script>

{#if items.length === 0}
	<EmptyListMessage title={m.playerHistoryEmpty()} />
{:else}
	<TracksListContainer
		{source}
		menuItems={(item) => [
			{
				label: m.playerRemoveFromHistory(),
				action: () => {
					void dbRemoveFromPlayHistory(item.id)
				},
			},
		]}
	/>
{/if}
