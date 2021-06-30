import { JSX } from 'solid-js'
import { useRouter } from '@rturnq/solid-router'
import { MusicItemKey } from '../../types/types'
import { IconButton, IconType } from '../icon-button/icon-button'
import { useModals } from '../modals/modals'
import { BaseEntitiesListProps } from '../entities-lists/entities-list-container'
import * as configs from '../../base-page-configs'

interface SortItem {
  name: string
  key: MusicItemKey
}

export interface LibraryPageConfig extends configs.BaseConfig {
  icon: IconType
  sortOptions: readonly SortItem[]
  actions?: JSX.Element
}

const SORT_NAME = { name: 'A to Z', key: MusicItemKey.NAME } as const
const SORT_YEAR = { name: 'Year', key: MusicItemKey.YEAR } as const

const CreateNewPlaylistButton = () => {
  const modals = useModals()

  return (
    <IconButton
      title='Create new playlist'
      icon={IconType.PLUS}
      onClick={() => {
        modals.createOrRenamePlaylist.show({ type: 'create' })
      }}
    />
  )
}

export const LIBRARY_PAGES_CONFIG: readonly LibraryPageConfig[] = [
  {
    ...configs.BASE_TRACKS_CONFIG,
    icon: IconType.MUSIC_NOTE,
    sortOptions: [
      SORT_NAME,
      { name: 'Album', key: MusicItemKey.ALBUM },
      { name: 'Artists', key: MusicItemKey.ARTISTS },
      SORT_YEAR,
      { name: 'Duration', key: MusicItemKey.DURATION },
    ],
  },
  {
    ...configs.BASE_ALBUMS_CONFIG,
    icon: IconType.ALBUM,
    sortOptions: [
      SORT_NAME,
      { name: 'Artists', key: MusicItemKey.ARTISTS },
      SORT_YEAR,
    ],
  },
  {
    ...configs.BASE_ARTISTS_CONFIG,
    icon: IconType.PERSON,
    sortOptions: [SORT_NAME],
  },
  {
    ...configs.BASE_PLAYLISTS_CONFIG,
    icon: IconType.PLAYLIST,
    actions: CreateNewPlaylistButton,
    sortOptions: [
      SORT_NAME,
      { name: 'Date created', key: MusicItemKey.DATE_CREATED },
    ],
    component: (props: BaseEntitiesListProps) => {
      const router = useRouter()

      return (
        <configs.BASE_PLAYLISTS_CONFIG.component
          {...props}
          onItemClick={(id) => router.push(`/playlist/${id}`)}
        />
      )
    },
  },
] as const
