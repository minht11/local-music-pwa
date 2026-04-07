export interface BookmarkRecord {
	id?: number
	trackId: number
	timestampSeconds: number
	note?: string
	createdAt: number
	updatedAt: number
}

export interface ResolvedBookmark extends Omit<BookmarkRecord, 'id'> {
	id: number
	trackName: string
	discourseName: string
}
