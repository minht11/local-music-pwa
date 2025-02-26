export interface TrackImportCount {
	/** Count of many tracks were newly added */
	newlyImported: number
	/** Count of many existing tracks were updated */
	existingUpdated: number
	/** Count of many tracks were removed */
	removed: number
	/** Index of currently scanned track */
	current: number
	/** Total count of tracks */
	total: number
}

export interface TrackImportMessage {
	finished: boolean
	count: TrackImportCount
}

export type TrackImportOptions =
	| {
			action: 'directory-add' | 'directory-rescan'
			dirId: number
			dirHandle: FileSystemDirectoryHandle
	  }
	| {
			action: 'file-handles-add'
			files: FileSystemFileHandle[]
	  }
	| {
			action: 'files-add'
			files: File[]
	  }
