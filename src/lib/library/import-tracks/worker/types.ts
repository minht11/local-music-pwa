export interface TrackImportCount {
	imported: number
	current: number
	total: number
}

export interface TrackImportMessage {
	finished: boolean
	count: TrackImportCount
}

export type TrackImportOptions =
	| {
			action: 'directory-replace'
			existingDirId: number
			newDirHandle: FileSystemDirectoryHandle
	  }
	| {
			existingDirId?: number
			action: 'directory-add'
			newDirHandle: FileSystemDirectoryHandle
	  }
	| {
			action: 'file-handles-add'
			files: FileSystemFileHandle[]
	  }
	| {
			action: 'files-add'
			files: File[]
	  }
