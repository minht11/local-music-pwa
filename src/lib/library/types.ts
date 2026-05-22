import type { IFormat } from 'music-metadata'
import type { FileEntity } from '$lib/helpers/file-system.ts'

export type LibraryStoreName = 'tracks' | 'albums' | 'artists' | 'playlists'

/**
 * Used in browsers where `showDirectoryPicker` is not supported.
 * `file` field is gonna be `File` in those browsers,
 * or if user has tracks from previous application version
 * where directories were not used `FileSystemHandle`.
 */
export const LEGACY_NO_NATIVE_DIRECTORY = -1

/** Special type of playlist which user cannot modify */
export const FAVORITE_PLAYLIST_ID = -1
export const FAVORITE_PLAYLIST_UUID = 'favorites'

/**
 * Used to represent unknown Artist/Album and other values inside database
 * Using ~ so when sorting items are always at the end
 */
export const UNKNOWN_ITEM = '~\0unknown'

export type UnknownItem = typeof UNKNOWN_ITEM

/**
 * Version number for the metadata schema stored in the database.
 * Increment this whenever need metadata fields are added so when rescanning tracks
 * existing tracks can be updated.
 */
export const CURRENT_METADATA_VERSION = 1

export type StringOrUnknownItem = (string & {}) | UnknownItem

interface BaseMusicItem {
	id: number
	name: string
}

export interface ParsedTrackData {
	name: string
	album: StringOrUnknownItem
	artists: StringOrUnknownItem[]
	year: StringOrUnknownItem
	duration: number
	genre: string[]
	trackNo: number
	trackOf: number
	discNo: number
	discOf: number
	language?: string
	image?: {
		optimized: boolean
		small: Blob
		full: Blob
	}
	primaryColor?: number
	/** See {@link CURRENT_METADATA_VERSION}. Absent on tracks scanned before this field existed (treat as 0). */
	metadataVersion?: number
	format?: IFormat
}

export interface UnknownTrack extends ParsedTrackData {
	uuid: string
	file: FileEntity
	scannedAt: number
	fileName: string
	directory: number
	metadataVersion?: number
	format?: IFormat
}

export interface Track extends BaseMusicItem, UnknownTrack {}

export interface Album extends BaseMusicItem {
	uuid: string
	artists: string[]
	year?: string
	image?: Blob
}

export interface Artist extends BaseMusicItem {
	uuid: string
}

export interface Playlist extends BaseMusicItem {
	uuid: string
	description: string
	createdAt: number
}

export interface PlaylistEntry {
	id: number
	playlistId: number
	trackId: number
	addedAt: number
}

export interface PlayHistoryEntry {
	id: number
	trackId: number
	playedAt: number
}

export interface Directory {
	id: number
	handle: FileSystemDirectoryHandle
}
