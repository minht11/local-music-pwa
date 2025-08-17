import type { FileEntity } from '$lib/helpers/file-system'

export interface TracksScanResult {
	/** Count of many tracks were newly added */
	newlyImported: number
	/** Index of currently scanned track */
	current: number
	/** Total count of tracks */
	total: number
}

export interface TracksScanMessage {
	finished: boolean
	count: TracksScanResult
}

/** @public */
export type TracksScanOptions =
	| {
			action: 'directory-add' | 'directory-rescan'
			dirId: number
			dirHandle: FileSystemDirectoryHandle
	  }
	// Used in the browsers which do not support `showDirectoryPicker`
	// or with tracks from previous application version
	| {
			action: 'legacy-files-migrate-from-v1'
			files: { uuid: string; file: FileEntity }[]
	  }
	| {
			action: 'legacy-files-add'
			files: FileEntity[]
	  }
