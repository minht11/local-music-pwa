interface TrackRowShape {
	readonly type: 'track'
	readonly entryId: number
}

interface CustomRowShape {
	readonly type: 'custom'
}

type RowShape = TrackRowShape | CustomRowShape

export const validateTrackListSourceCounts = (count: number, trackCount: number): void => {
	invariant(
		Number.isInteger(count) && count >= 0,
		`TrackListSource.count must be a non-negative integer, received ${count}`,
	)
	invariant(
		Number.isInteger(trackCount) && trackCount >= 0,
		`TrackListSource.trackCount must be a non-negative integer, received ${trackCount}`,
	)
	invariant(
		trackCount <= count,
		`TrackListSource.trackCount (${trackCount}) cannot exceed count (${count})`,
	)
}

export const validateTrackListSourceRow = (
	index: number,
	row: RowShape,
	key: string | number,
): void => {
	if (row.type === 'track') {
		invariant(
			key === row.entryId,
			`TrackListSource.keyAt(${index}) must equal track entryId ${row.entryId}, received ${String(key)}`,
		)

		return
	}

	invariant(
		typeof key !== 'number',
		`TrackListSource.keyAt(${index}) must return a non-number key for a custom row`,
	)
}

export const validateUniqueTrackListSourceKey = (
	index: number,
	key: string | number,
	seen: ReadonlySet<string | number>,
): void => {
	invariant(
		!seen.has(key),
		`TrackListSource.keyAt(${index}) returned duplicate key ${String(key)}`,
	)
}

export const validateTrackListSourceTrackCount = (declared: number, resolved: number): void => {
	invariant(
		declared === resolved,
		`TrackListSource.trackCount is ${declared}, but resolving every row found ${resolved} tracks`,
	)
}
