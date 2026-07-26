import type { QueueOrigin } from '$lib/stores/player/queue.svelte.ts'
import { TRACK_ROW_HEIGHT } from './row-height.ts'
import type { TrackItemClick, TrackListSource } from './TracksListContainer.svelte'

interface TrackIdsSourceOptions {
	/** Describes where playback originates when the default click starts a new queue. */
	queueOrigin?: () => QueueOrigin
	/** Replaces the default click, which plays the list from the clicked row. */
	onItemClick?: (data: TrackItemClick) => void
	/**
	 * A row's stable id, for lists that carry one of their own — a playlist row is
	 * its `PlaylistEntry.id`, exact under duplicate tracks. Omitting it entirely is
	 * what makes the ids-must-be-unique rule below conditional; supplying it and
	 * then returning `undefined` for a live row is a bug, not a fallback.
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

	// Without `entryIdAt` a row's identity is its track id. With it, a row the list
	// still holds must resolve — silently falling back would swap in a foreign
	// identity and desync selection and virtualizer keys.
	const { entryIdAt: providedEntryIdAt } = options
	const entryIdAt =
		providedEntryIdAt === undefined
			? trackIdAt
			: (index: number): number => {
					const entryId = providedEntryIdAt(index)
					invariant(entryId !== undefined, 'track ids source row has no entry id')

					return entryId
				}

	/**
	 * Answers the selection controller's liveness check in O(1). `$derived`, so it
	 * is built only once a selection exists to probe it, and rebuilt only when the
	 * ids array itself changes. Without `entryIdAt` the ids array *is* the id set,
	 * so it is handed to `Set` directly rather than mapped into a throwaway copy.
	 */
	const entryIds = $derived(
		providedEntryIdAt === undefined
			? new Set(items())
			: new Set(items().map((_, index) => entryIdAt(index))),
	)

	if (import.meta.env.DEV) {
		$effect(() => {
			const ids = items()

			invariant(
				providedEntryIdAt !== undefined || new Set(ids).size === ids.length,
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
		hasEntry: (entryId) => entryIds.has(entryId),
		onItemClick: (data) => {
			if (options.onItemClick) {
				options.onItemClick(data)
				return
			}

			player.playFrom(data.index, items(), options.queueOrigin?.())
		},
	}
}
