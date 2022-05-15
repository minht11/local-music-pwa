import { BaseMusicItem, Track } from '../../types/types'
import * as configs from '../../base-page-configs'

export const SEARCH_MAIN_PATH = '/search/:searchTerm?'

export interface SearchPageConfig extends configs.BaseConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: (term: string, item: any) => boolean
}

const lowerCaseIncludes = (term: string, value = '') =>
  value.toLowerCase().includes(term)

const filterByName = (term: string, item: BaseMusicItem) =>
  lowerCaseIncludes(term, item.name)

export const CONFIGS: readonly SearchPageConfig[] = [
  {
    ...configs.BASE_TRACKS_CONFIG,
    filter: (term: string, track: Track) => {
      const foundName = lowerCaseIncludes(term, track.name)
      const foundArtist = lowerCaseIncludes(term, track.artists.join(' '))
      const foundAlbum = lowerCaseIncludes(term, track.album)

      return foundName || foundArtist || foundAlbum
    },
  },
  {
    ...configs.BASE_ARTISTS_CONFIG,
    filter: filterByName,
  },
  {
    ...configs.BASE_ALBUMS_CONFIG,
    filter: filterByName,
  },
  {
    ...configs.BASE_PLAYLISTS_CONFIG,
    filter: filterByName,
  },
] as const
