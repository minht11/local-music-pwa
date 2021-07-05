import { Component, createMemo, Show } from 'solid-js'
import {
  VirtualContainer,
  VirtualItemProps,
} from '@minht11/solid-virtual-container'
import { FAVORITES_ID } from '../../../types/constants'
import { IconButton, IconType } from '../../icon-button/icon-button'
import { Icon } from '../../icon/icon'
import { useEntitiesStore } from '../../../stores/stores'
import {
  EntitiesListContainer,
  BaseEntitiesListProps,
} from '../entities-list-container'
import { MenuOptions, useMenu } from '../../menu/menu'
import * as styles from './playlists-list.css'
import { clx } from '../../../utils'
import { useModals } from '../../modals/modals'
import { MusicItemType } from '../../../types/types'

interface PlaylistItem extends VirtualItemProps<string> {
  onClick: () => void
  onContextMenu?: (e: MouseEvent) => void
  isSelected?: boolean
  disableMenu?: boolean
}

const PlaylistListItem = (props: PlaylistItem) => {
  const [entities, entitiesActions] = useEntitiesStore()
  const menu = useMenu()
  const modals = useModals()

  const isFavorites = () => props.item === FAVORITES_ID

  const onMenuHandler = (anchor: boolean, e: MouseEvent) => {
    if (props.disableMenu || isFavorites()) {
      return
    }

    const options: MenuOptions = anchor
      ? { anchor: true, preferredAlign: { horizontal: 'right' } }
      : { anchor: false, position: { top: e.y, left: e.x } }

    menu?.show(
      [
        {
          name: 'Rename',
          action: () =>
            modals.createOrRenamePlaylist.show({
              type: 'rename',
              playlistId: props.item,
            }),
        },
        {
          name: 'Remove',
          action: () =>
            entitiesActions.remove(props.item, MusicItemType.PLAYLIST),
        },
      ],
      e.target as HTMLElement,
      options,
    )

    e.stopPropagation()
    e.preventDefault()
  }

  const item = createMemo(() => {
    const id = props.item
    if (isFavorites()) {
      return {
        icon: IconType.FAVORITE,
        name: 'Favorites',
      }
    }

    return {
      icon: IconType.PLAYLIST,
      name: entities.playlists[id]?.name,
    }
  })

  return (
    <div
      style={props.style}
      className={clx(styles.playlistItem, props.isSelected && styles.selected)}
      tabIndex={props.tabIndex}
      onClick={props.onClick}
      onContextMenu={[onMenuHandler, false]}
    >
      <Icon icon={item().icon} />
      <div className={styles.name}>{item().name}</div>
      <Show when={!props.disableMenu}>
        <IconButton
          disabled={isFavorites()}
          className={styles.menu}
          aria-label='Menu button'
          aria-haspopup='true'
          aria-expanded='false'
          icon={IconType.MORE_VERTICAL}
          tabIndex={props.tabIndex}
          onClick={[onMenuHandler, true]}
        />
      </Show>
    </div>
  )
}

export interface PlaylistListProps extends BaseEntitiesListProps {
  hideFavorites?: boolean
  disableMenu?: boolean
  selectedId?: string
  onItemClick?: (id: string, index: number) => void
}

export const PlaylistList: Component<PlaylistListProps> = (props) => {
  // Maybe memo is not needed here?
  const playlistsIds = createMemo(() => {
    const { items } = props

    if (props.hideFavorites) {
      return items
    }

    return [FAVORITES_ID, ...items]
  })

  return (
    <EntitiesListContainer {...props} entityName='playlist'>
      <VirtualContainer itemSize={{ height: 48 }} items={playlistsIds()}>
        {(itemProps) => (
          <PlaylistListItem
            {...itemProps}
            disableMenu={props.disableMenu}
            isSelected={props.selectedId === itemProps.item}
            onClick={() => props.onItemClick?.(itemProps.item, itemProps.index)}
          />
        )}
      </VirtualContainer>
    </EntitiesListContainer>
  )
}
