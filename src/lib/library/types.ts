import type { FileEntity } from '$lib/helpers/file-system.ts'

export type LibraryItemStoreName = 'tracks' | 'albums' | 'artists' | 'playlists'

/**
 * Used in browsers where `showDirectoryPicker` is not supported.
 * `file` field is gonna be `File` in those browsers,
 * or if user has tracks from previous application version
 * where directories were not used `FileSystemHandle`.
 */
export const LEGACY_NO_NATIVE_DIRECTORY = -1

/** Special type of playlist which user cannot modify */
export const FAVORITE_PLAYLIST_ID = -1
export const FAVORITE_PLAYLIST_UUID = 'favorite-sba6-42b4-a66f-162627d150a8'

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
    created: number
}

export interface Directory {
    id: number
    handle: FileSystemDirectoryHandle
}
