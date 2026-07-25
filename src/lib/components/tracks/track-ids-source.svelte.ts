import type { QueueOrigin } from '$lib/stores/player/queue.svelte.ts'
import { TRACK_ROW_HEIGHT } from './row-height.ts'
import type { TrackItemClick, TrackListRow, TrackListSource } from './TracksListContainer.svelte'

interface TrackIdsSourceOptions {
	/** Describes where playback originates when the default click starts a new queue. */
	queueSource?: () => QueueOrigin
	/** Replaces the default click, which plays the list from the clicked row. */
	onItemClick?: (data: TrackItemClick) => void
}

/**
 * The row source for a plain list of track ids, where a row's identity *is* its
 * track id — so the list must not repeat one (DEV asserts it). A list that can,
 * like the queue or a playlist, builds its own `rowAt` with real entry ids.
 */
export const createTrackIdsSource = (
	items: () => readonly number[],
	options: TrackIdsSourceOptions = {},
): TrackListSource => {
	const player = usePlayer()

	if (import.meta.env.DEV) {
		$effect(() => {
			const ids = items()

			invariant(
				new Set(ids).size === ids.length,
				'createTrackIdsSource requires unique track ids; build a `rowAt` with real entry ids instead',
			)
		})
	}

	return {
		get count() {
			return items().length
		},
		get trackCount() {
			return items().length
		},
		// From the queue, not `activeTrack`: that query keeps its previous value while
		// refetching, so across a track change it would briefly light up the row that
		// just stopped playing.
		isRowActive: (row) => row.trackId === player.queue.current?.trackId,
		rowAt: (index: number): TrackListRow => {
			const id = items()[index]
			invariant(id !== undefined, 'track ids source row index out of range')

			return { type: 'track', entryId: id, trackId: id }
		},
		// Every row is a default-height track row keyed by its track id.
		sizeAt: () => TRACK_ROW_HEIGHT,
		keyAt: (index: number) => {
			const id = items()[index]
			invariant(id !== undefined, 'track ids source row index out of range')

			return id
		},
		onItemClick: (data) => {
			if (options.onItemClick) {
				options.onItemClick(data)
				return
			}

			player.playFrom(data.index, items(), options.queueSource?.())
		},
	}
}
