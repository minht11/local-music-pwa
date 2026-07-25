import type { QueueOrigin } from '$lib/stores/player/queue.svelte.ts'
import { TRACK_ROW_HEIGHT } from './row-height.ts'
import type { TrackItemClick, TrackListSource } from './TracksListContainer.svelte'

interface TrackIdsSourceOptions {
	/** Describes where playback originates when the default click starts a new queue. */
	queueSource?: () => QueueOrigin
	/** Replaces the default click, which plays the list from the clicked row. */
	onItemClick?: (data: TrackItemClick) => void
	/**
	 * A row's stable id, for lists that carry one of their own — a playlist row is
	 * its `PlaylistEntry.id`, exact under duplicate tracks. Falls back to the track
	 * id per row, which is what makes the ids-must-be-unique rule below conditional.
	 */
	entryIdAt?: (index: number) => number | undefined
}

/**
 * The row source for a flat list of track ids. Without `entryIdAt` a row's
 * identity *is* its track id, so the list must not repeat one (DEV asserts it).
 */
export const createTrackIdsSource = (
	items: () => readonly number[],
	options: TrackIdsSourceOptions = {},
): TrackListSource => {
	const player = usePlayer()

	const trackIdAt = (index: number): number => {
		const id = items()[index]
		invariant(id !== undefined, 'track ids source row index out of range')

		return id
	}

	const entryIdAt = (index: number): number => options.entryIdAt?.(index) ?? trackIdAt(index)

	if (import.meta.env.DEV) {
		$effect(() => {
			const ids = items()

			invariant(
				options.entryIdAt !== undefined || new Set(ids).size === ids.length,
				'createTrackIdsSource requires unique track ids; pass `entryIdAt` for a list that repeats one',
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
		rowAt: (index) => ({ type: 'track', entryId: entryIdAt(index), trackId: trackIdAt(index) }),
		// Every row is a default-height track row.
		sizeAt: () => TRACK_ROW_HEIGHT,
		keyAt: entryIdAt,
		onItemClick: (data) => {
			if (options.onItemClick) {
				options.onItemClick(data)
				return
			}

			player.playFrom(data.index, items(), options.queueSource?.())
		},
	}
}
