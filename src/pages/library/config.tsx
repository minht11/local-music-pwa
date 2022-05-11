import { JSX } from 'solid-js'
import { useNavigate } from 'solid-app-router'
import { MusicItemKey } from '~/types/types'
import { Icon, IconType } from '~/components/icon/icon'
import { useModals } from '~/components/modals/modals'
import * as configs from '~/base-page-configs'
import * as styles from './library.css'

interface SortItem {
  name: string
  key: MusicItemKey
}

export interface LibraryPageConfig extends configs.BaseConfig {
  icon: IconType
  iconSelected: IconType
  sortOptions: readonly SortItem[]
  actions?: JSX.Element
}

const SORT_NAME = { name: 'A to Z', key: MusicItemKey.NAME } as const
const SORT_YEAR = { name: 'Year', key: MusicItemKey.YEAR } as const

const CreateNewPlaylistButton = () => {
  const modals = useModals()

  return (
    <button
      className={styles.outlinedButton}
      onClick={() => {
        modals.createOrRenamePlaylist.show({ type: 'create' })
      }}
    >
      <Icon icon='plus' />
      New playlist
    </button>
  )
}

export const CONFIG: readonly LibraryPageConfig[] = [
  {
    ...configs.BASE_TRACKS_CONFIG,
    icon: 'musicNoteOutline',
    iconSelected: 'musicNote',
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
    icon: 'albumOutline',
    iconSelected: 'album',
    sortOptions: [
      SORT_NAME,
      { name: 'Artists', key: MusicItemKey.ARTISTS },
      SORT_YEAR,
    ],
  },
  {
    ...configs.BASE_ARTISTS_CONFIG,
    icon: 'personOutline',
    iconSelected: 'person',
    sortOptions: [SORT_NAME],
  },
  {
    ...configs.BASE_PLAYLISTS_CONFIG,
    icon: 'playlist',
    iconSelected: 'playlist',
    actions: CreateNewPlaylistButton,
    sortOptions: [
      SORT_NAME,
      { name: 'Date created', key: MusicItemKey.DATE_CREATED },
    ],
    component: (props) => {
      const navigate = useNavigate()

      return (
        <configs.BASE_PLAYLISTS_CONFIG.component
          {...props}
          onItemClick={(id) => navigate(`/playlist/${id}`)}
        />
      )
    },
  },
] as const

export const LIBRARY_PATH = '/library'
export const DEFAULT_LIBRARY_PATH = `${LIBRARY_PATH}/${CONFIG[0].path}`
