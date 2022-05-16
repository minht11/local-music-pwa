import { VoidComponent } from 'solid-js'
import { TracksList } from './components/entities-lists/tracks-list/tracks-list'
import { MusicItemType } from './types/types'
import { PlaylistList } from './components/entities-lists/playlists-list/playlists-list'
import {
  AlbumsGrid,
  ArtistsGrid,
} from './components/entities-lists/albums-artists-grids'

export interface BaseListProps {
  items: readonly string[]
}

export interface BaseConfig {
  type: MusicItemType
  title: string
  path: string
  component: VoidComponent<BaseListProps>
}

export const BASE_TRACKS_CONFIG = {
  path: 'tracks',
  title: 'Tracks',
  type: MusicItemType.TRACK,
  component: TracksList,
} as const

export const BASE_ARTISTS_CONFIG = {
  path: 'artists',
  title: 'Artists',
  type: MusicItemType.ARTIST,
  component: ArtistsGrid,
} as const

export const BASE_ALBUMS_CONFIG = {
  path: 'albums',
  title: 'Albums',
  type: MusicItemType.ALBUM,
  component: AlbumsGrid,
} as const

export const BASE_PLAYLISTS_CONFIG = {
  path: 'playlists',
  title: 'Playlists',
  type: MusicItemType.PLAYLIST,
  component: PlaylistList,
} as const
