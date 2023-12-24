export interface TrackImportCount {
	imported: number
	current: number
	total: number
}

export interface TrackImportMessage {
	finished: boolean
	count: TrackImportCount
}
