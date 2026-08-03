import type { PlaylistEntry } from '$lib/library/types.ts'
import type { QueueOrigin } from '$lib/stores/player/queue.svelte.ts'
import { TRACK_ROW_HEIGHT } from './row-height.ts'
import type { TrackItemClick, TrackListSource } from './TracksListContainer.svelte'

/**
 * A track list's rows, resolved by index so nothing materializes the list.
 * `entryId` is the row's identity: the track id where a list holds one row per
 * track, a real row id where it can repeat one.
 */
export interface TrackRows {
	readonly count: number
	trackIdAt: (index: number) => number
	entryIdAt: (index: number) => number
	/** For the queue. Read on demand, never on the render path. */
	trackIds: () => readonly number[]
}

/** Identity is the track id, so the list must not repeat one. */
export const trackIdRows = (ids: () => readonly number[]): TrackRows => {
	const idAt = (index: number): number => {
		const id = ids()[index]
		invariant(id !== undefined, 'track rows index out of range')

		return id
	}

	return {
		get count() {
			return ids().length
		},
		trackIdAt: idAt,
		entryIdAt: idAt,
		trackIds: ids,
	}
}

/** Keyed by `PlaylistEntry.id`, so duplicate tracks stay distinct. */
export const playlistEntryRows = (entries: () => readonly PlaylistEntry[]): TrackRows => {
	const entryAt = (index: number): PlaylistEntry => {
		const entry = entries()[index]
		invariant(entry !== undefined, 'playlist rows index out of range')

		return entry
	}

	return {
		get count() {
			return entries().length
		},
		trackIdAt: (index) => entryAt(index).trackId,
		entryIdAt: (index) => entryAt(index).id,
		trackIds: () => entries().map((entry) => entry.trackId),
	}
}

interface TrackRowsSourceOptions {
	/** Where playback originates when the default click starts a new queue. */
	queueOrigin?: () => QueueOrigin
	/** Replaces the default click, which plays the list from the clicked row. */
	onItemClick?: (data: TrackItemClick) => void
}

export const createTrackRowsSource = (
	rows: () => TrackRows,
	options: TrackRowsSourceOptions = {},
): TrackListSource => {
	const player = usePlayer()

	// Answers `hasEntry` in O(1).
	const entryIds = $derived.by(() => {
		const { count, entryIdAt } = rows()
		const ids = new Set<number>()

		for (let index = 0; index < count; index += 1) {
			ids.add(entryIdAt(index))
		}

		return ids
	})

	return {
		get count() {
			return rows().count
		},
		get trackCount() {
			return rows().count
		},
		isRowActive: (row) => row.trackId === player.queue.current?.trackId,
		rowAt: (index) => {
			const current = rows()

			return {
				type: 'track',
				entryId: current.entryIdAt(index),
				trackId: current.trackIdAt(index),
			}
		},
		size: TRACK_ROW_HEIGHT,
		keyAt: (index) => rows().entryIdAt(index),
		hasEntry: (entryId) => entryIds.has(entryId),
		onItemClick: (data) => {
			if (options.onItemClick) {
				options.onItemClick(data)

				return
			}

			player.playFrom(data.index, rows().trackIds(), options.queueOrigin?.())
		},
	}
}
