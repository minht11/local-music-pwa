import { JSX } from 'solid-js'
import { Album, MusicItemType, Playlist, Track } from '../../types/types'
import { State as EntitiesState } from '../../stores/entities/create-entities-store'
import { FAVORITES_ID } from '../../types/constants'
import { IconButton, IconType } from '../icon-button/icon-button'
import { useModals } from '../modals/modals'
import { MenuItem } from '../menu/types'
import { useEntitiesStore } from '../../stores/stores'
import * as configs from '../../base-page-configs'

type EntitiesActions = ReturnType<typeof useEntitiesStore>[1]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DetailsPageConfig<T = any> extends configs.BaseConfig {
  type: Exclude<MusicItemType, typeof MusicItemType.TRACK>
  itemSelector?: (id: string, state: EntitiesState) => T
  info?: (item: T) => string[]
  actions?: (item: T) => JSX.Element
  // TODO: needs reworking, see tracks list for more info.
  additionalTrackMenuItems?: (
    item: T,
    track: Track,
    actions: EntitiesActions,
  ) => MenuItem[]
  showTrackIndex?: boolean
  sortTrackByKey?: keyof Track
}

const PLAYLISTS_CONFIG: DetailsPageConfig = {
  ...configs.BASE_PLAYLISTS_CONFIG,
  itemSelector: (id: string, entities: EntitiesState) => {
    if (id !== FAVORITES_ID) {
      return undefined
    }

    const item: Omit<Playlist, 'dateCreated'> = {
      id,
      type: MusicItemType.PLAYLIST,
      name: 'Favorites',
      trackIds: entities.favorites,
    }

    return item
  },
  actions: (item: Playlist) => {
    const modals = useModals()

    return (
      <IconButton
        icon={IconType.EDIT}
        disabled={item.id === FAVORITES_ID}
        title='Rename playlist'
        onClick={() =>
          modals.createOrRenamePlaylist.show({
            playlistId: item.id,
            type: 'rename',
          })
        }
      ></IconButton>
    )
  },
}

// This is separate variable only because typescript can't handle
// typecheking of dynamic arrays which map function makes it.
const BASE_DETAILS_PAGES_CONFIG: readonly DetailsPageConfig[] = [
  {
    ...configs.BASE_ARTISTS_CONFIG,
    sortTrackByKey: 'name',
  },
  {
    ...configs.BASE_ALBUMS_CONFIG,
    info: (item: Album) => [item.artists.join(', '), item.year || ''],
    showTrackIndex: true,
    sortTrackByKey: 'trackNo',
  },
  {
    ...PLAYLISTS_CONFIG,
    additionalTrackMenuItems: (item: Playlist, track, actions) => [
      {
        name: 'Remove from playlist',
        action: () => actions.removeTracksFromPlaylist(item.id, [track.id]),
      },
    ],
  },
]

export const DETAILS_PAGES_CONFIG: readonly DetailsPageConfig[] =
  BASE_DETAILS_PAGES_CONFIG.map((page) => ({
    ...page,
    // Remove last character 's', since item is singular and not a list.
    path: page.path.slice(0, -1),
  })) as DetailsPageConfig[]
