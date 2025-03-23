import type { FileEntity } from '$lib/helpers/file-system'

export interface TrackImportCount {
	/** Count of many tracks were newly added */
	newlyImported: number
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
	// Used in the browsers which do not support `showDirectoryPicker`
	// or with tracks from previous application version
	| {
			action: 'legacy-files-migrate-from-prev-app-version'
			files: FileEntity[]
	  }
	| {
			action: 'legacy-files-add'
			files: FileEntity[]
	  }
