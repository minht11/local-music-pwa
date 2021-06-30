interface FileLegacy {
  type: 'file'
  file: File
}

interface FileHandle {
  type: 'fileRef'
  file: FileSystemFileHandle
}

export type FileWrapper = FileLegacy | FileHandle

export type ImageType = Blob | undefined

export enum MusicItemType {
  TRACK = 0,
  ALBUM = 1,
  ARTIST = 2,
  PLAYLIST = 3,
}

// These values cannot change,
// because of already persisted data.
// export const MusicItemType = {
//   TRACK: '@type/track',
//   ALBUM: '@type/album',
//   ARTIST: '@type/artist',
//   PLAYLIST: '@type/playlist',
// } as const

export enum MusicItemKey {
  NAME = 'name',
  ARTISTS = 'artists',
  ALBUM = 'album',
  YEAR = 'year',
  DURATION = 'duration',
  DATE_CREATED = 'dateCreated',
}

export interface BaseMusicItem {
  id: string
  type: MusicItemType
  name: string
}

export interface UnknownTrack {
  name: string
  album?: string
  artists: string[]
  year?: string
  duration: number
  genre: string[]
  trackNo?: number
  trackOf?: number
  image?: ImageType
  fileWrapper: FileWrapper
  hue?: number
}

export interface Track extends BaseMusicItem, UnknownTrack {
  type: MusicItemType.TRACK
}

export interface BaseMusicItemWithTrackIds extends BaseMusicItem {
  trackIds: string[]
}

// For Album and Artists id and name are the same thing,
// but for consistency still include both.
export interface Album extends BaseMusicItemWithTrackIds {
  type: MusicItemType.ALBUM
  artists: string[]
  year?: string
  image?: ImageType
}

export interface Artist extends BaseMusicItemWithTrackIds {
  type: MusicItemType.ARTIST
}

export interface Playlist extends BaseMusicItemWithTrackIds {
  type: MusicItemType.PLAYLIST
  dateCreated: number
}
