import type { FileEntity } from '$lib/helpers/file-system'

export type OmitId<T> = Omit<T, 'id'>

/**
 * Used in browsers where `showDirectoryPicker` is not supported.
 * `file` field is gonna be `File` in those browsers,
 * or if user has tracks from previous application version
 * where directories were not used `FileSystemHandle`.
 */
export const LEGACY_NO_NATIVE_DIRECTORY = -1

export interface BaseMusicItem {
	id: number
	name: string
}

export interface ParsedTrackData {
	name: string
	album?: string
	artists: string[]
	year?: string
	duration: number
	genre: string[]
	trackNo?: number
	trackOf?: number
	image?: {
		optimized: boolean
		small: Blob
		full: Blob
	}
	primaryColor?: number
}

export interface UnknownTrack extends ParsedTrackData {
	file: FileEntity
	lastScanned: number
	fileName: string
	directory: number
}

export type Track = BaseMusicItem & UnknownTrack

export interface Album extends BaseMusicItem {
	artists: string[]
	year?: string
	image?: Blob
}

export interface Artist extends BaseMusicItem {}

export interface Playlist extends BaseMusicItem {
	created: number
}

export interface Directory {
	id: number
	handle: FileSystemDirectoryHandle
}
