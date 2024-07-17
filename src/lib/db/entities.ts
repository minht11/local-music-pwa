import type { FileEntity } from '$lib/helpers/file-system'

export type OmitId<T> = Omit<T, 'id'>

export const MusicItemType = {
	Track: 0,
	Album: 1,
	Artist: 2,
	Playlist: 3,
} as const

export type MusicItemType = (typeof MusicItemType)[keyof typeof MusicItemType]

export const LegacyDirectoryId = {
	/** File copied into indexeddb */
	File: -1,
	/**
	 * 	Handles to files in environments where no directory access is possible
	 *  or saved in previous versions of the app
	 */
	FileHandle: -2,
}

export const MusicItemKey = {
	NAME: 'name',
	ArtistS: 'artists',
	Album: 'album',
	YEAR: 'year',
	DURATION: 'duration',
	DATE_CREATED: 'dateCreated',
} as const

export type MusicItemKey = (typeof MusicItemKey)[keyof typeof MusicItemKey]

export interface BaseMusicItem {
	id: number
	type: MusicItemType
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
	// TODO. Rename this field to image
	images?: {
		optimized: boolean
		small: Blob
		full: Blob
	}
	primaryColor?: number
}

export interface UnknownTrack extends ParsedTrackData {
	type: typeof MusicItemType.Track
	file: FileEntity
	directory: number
	lastScanned: number
}

export type Track = BaseMusicItem & UnknownTrack

export interface Album extends BaseMusicItem {
	type: typeof MusicItemType.Album
	artists: string[]
	year?: string
	image?: Blob
}

export interface Artist extends BaseMusicItem {
	type: typeof MusicItemType.Artist
}

export interface Playlist extends BaseMusicItem {
	type: typeof MusicItemType.Playlist
	created: number
}

export interface Directory {
	id: number
	handle: FileSystemDirectoryHandle
}
