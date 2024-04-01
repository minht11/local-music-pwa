import type { FileEntity } from '$lib/helpers/file-system'

export const MusicItemType = {
	TRACK: 0,
	ALBUM: 1,
	ARTIST: 2,
	PLAYLIST: 3,
} as const

export type MusicItemType = (typeof MusicItemType)[keyof typeof MusicItemType]

export const MusicItemKey = {
	NAME: 'name',
	ARTISTS: 'artists',
	ALBUM: 'album',
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

export interface UnknownTrack {
	type: typeof MusicItemType.TRACK
	name: string
	album?: string
	artists: string[]
	year?: string
	duration: number
	genre: string[]
	trackNo?: number
	trackOf?: number
	images?: {
		optimized: boolean
		small: Blob
		full: Blob
	}
	file: FileEntity
	primaryColor?: number
	isFavorite: boolean
	directory: number
}

export interface Track extends BaseMusicItem, UnknownTrack {
	type: typeof MusicItemType.TRACK
}

export interface Album extends BaseMusicItem {
	type: typeof MusicItemType.ALBUM
	artists: string[]
	year?: string
	image?: Blob
}

export interface Artist extends BaseMusicItem {
	type: typeof MusicItemType.ARTIST
}

export interface Playlist extends BaseMusicItem {
	type: typeof MusicItemType.PLAYLIST
	dateCreated: number
	trackIDs: number[]
}

export interface Directory {
	id: number
	handle: FileSystemDirectoryHandle
}
