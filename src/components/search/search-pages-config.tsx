import { Component } from 'solid-js'
import { TracksList } from '../entities-lists/tracks-list/tracks-list'
import { MusicItemType, Track } from '../../types/types'
import {
  AlbumsGrid,
  AlbumsStrip,
  ArtistsGrid,
  ArtistsStrip,
} from '../entities-lists/albums-artists-grids'
import { BaseEntitiesListProps } from '../entities-lists/entities-list-container'

export const SEARCH_MAIN_PATH = '/search/:searchTerm?'

export interface SearchPageConfig {
  path: string
  title: string
  type: MusicItemType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: (item: any, term: string) => boolean
  maxPreviewCount?: number
  component: Component<BaseEntitiesListProps>
  previewComponent?: Component<BaseEntitiesListProps>
}

const lowerCaseIncludes = (value = '', term: string) =>
  value.toLowerCase().includes(term)

const filterByName = (item: { name: string }, term: string) =>
  lowerCaseIncludes(item.name, term)

export const SEARCH_PAGES_CONFIG: readonly SearchPageConfig[] = [
  {
    path: 'tracks',
    title: 'tracks',
    type: MusicItemType.TRACK,
    filter: (track: Track, term: string) => {
      const foundName = lowerCaseIncludes(track.name, term)
      const foundArtist = lowerCaseIncludes(track.artists.join(' '), term)
      const foundAlbum = lowerCaseIncludes(track.album, term)

      return foundName || foundArtist || foundAlbum
    },
    maxPreviewCount: 5,
    component: TracksList,
  },
  {
    path: 'artists',
    title: 'artist',
    type: MusicItemType.ARTIST,
    filter: filterByName,
    previewComponent: ArtistsStrip,
    component: ArtistsGrid,
  },
  {
    path: 'albums',
    title: 'album',
    type: MusicItemType.ALBUM,
    filter: filterByName,
    previewComponent: AlbumsStrip,
    component: AlbumsGrid,
  },
] as const
