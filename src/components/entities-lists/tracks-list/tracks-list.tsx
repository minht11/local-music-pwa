import { Component, createMemo } from 'solid-js'
import { useRouter } from '@rturnq/solid-router'
import {
  VirtualContainer,
  VirtualItemProps,
} from '@minht11/solid-virtual-container'
import { Track } from '../../../types/types'
import { IconButton, IconType } from '../../icon-button/icon-button'
import { clx, formatTime, pluralize } from '../../../utils'
import { MusicImage } from '../../music-image/music-image'
import { useMenu, MenuItem, MenuOptions } from '../../menu/menu'
import { useEntitiesStore, usePlayerStore } from '../../../stores/stores'
import { useModals } from '../../modals/modals'
import {
  EntitiesListContainer,
  BaseEntitiesListProps,
} from '../entities-list-container'
import * as styles from './tracks-list.css'

const UNKNOWN_ITEM_STRING = '<unknown>'

type EntitiesActions = ReturnType<typeof useEntitiesStore>[1]

export interface TracksListProps extends BaseEntitiesListProps {
  onItemClick?: (item: Track, index: number) => void
  showIndex?: boolean
  isPlayingItem?: (item: Track, index: number) => boolean
  // TODO: Menu handling needs rewriting. One solution is predefined
  // options list.
  additionalMenuItems?: (item: Track, actions: EntitiesActions) => MenuItem[]
}

type VirtualTrackProps = VirtualItemProps<string>

interface TracksListItemProps extends VirtualTrackProps {
  showIndex?: boolean
  onItemClick?: (item: Track, index: number) => void
  isPlayingItem?: (item: Track, index: number) => boolean
  additionalMenuItems?: (item: Track, actions: EntitiesActions) => MenuItem[]
}

const artistsToString = (artists: string[]) =>
  artists.length ? artists.join(', ') : UNKNOWN_ITEM_STRING

const TrackListItem = (props: TracksListItemProps) => {
  const router = useRouter()
  const modals = useModals()
  const [entities, entitiesActions] = useEntitiesStore()
  const [, playerActions] = usePlayerStore()

  const [playerState] = usePlayerStore()

  const menu = useMenu()

  const track = () => entities.tracks[props.item]

  const getMenuItems = () => {
    const trackItem = track()
    const { artists, id: trackId } = trackItem

    const isFavorited = entities.favorites.includes(trackId)

    const menuItems = [
      {
        name: 'Add to queue',
        action: () => {
          playerActions.addToQueue([trackId])
        },
      },
      artists.length && {
        name: `View ${pluralize(artists.length, 'artist')}`,
        action: () => {
          if (artists.length > 1) {
            modals.viewArtists.show({ artistsIds: trackItem.artists })
          } else {
            router.push(`/artist/${artists[0]}`)
          }
        },
      },
      trackItem.album && {
        name: 'View album',
        action: () => {
          router.push(`/album/${trackItem.album}`)
        },
      },
      {
        name: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
        action: () => {
          if (isFavorited) {
            entitiesActions.unfavoriteTrack(trackId)
          } else {
            entitiesActions.favoriteTrack(trackId)
          }
        },
      },
      {
        name: 'Add to playlist',
        action: () => {
          modals.addToPlaylists.show({ trackIds: [trackId] })
        },
      },
      props.additionalMenuItems?.(track(), entitiesActions),
      {
        name: 'Remove from the library',
        action: () => {
          entitiesActions.removeTracks([trackId])
        },
      },
    ].filter(Boolean) as MenuItem[]

    return menuItems
  }

  const onMenuHandler = (anchor: boolean, e: MouseEvent) => {
    const options: MenuOptions = anchor
      ? { anchor: true, preferredAlign: { horizontal: 'right' } }
      : { anchor: false, position: { top: e.y, left: e.x } }

    menu.show(getMenuItems(), e.target as HTMLElement, options)

    e.stopPropagation()
    e.preventDefault()
  }

  const onClickHandler = () => {
    const { index } = props

    if (props.onItemClick) {
      props.onItemClick(track(), index)
    } else {
      // Default click action.
      playerActions.playTrack(index, props.items)
    }
  }

  const isItemPlaying = createMemo(() => {
    const { isPlayingItem } = props
    if (isPlayingItem) {
      return isPlayingItem(track(), props.index)
    }

    return playerState.activeTrack === track()
  })

  return (
    <div
      style={props.style}
      className={clx(styles.trackListItem, isItemPlaying() && styles.active)}
      tabIndex={props.tabIndex}
      onClick={onClickHandler}
      role='listitem'
      onContextMenu={[onMenuHandler, false]}
    >
      {props.showIndex ? (
        <div className={styles.firstColumn}>{props.index + 1}</div>
      ) : (
        <MusicImage
          item={track()}
          className={clx(styles.firstColumn, styles.artwork)}
        />
      )}

      <div className={styles.title}>{track().name || UNKNOWN_ITEM_STRING}</div>
      <div className={styles.artist}>{artistsToString(track().artists)}</div>

      <div className={styles.album}>{track().album || UNKNOWN_ITEM_STRING}</div>

      <div className={styles.time}>{formatTime(track().duration)}</div>

      <IconButton
        aria-label='More actions'
        className={styles.menu}
        icon={IconType.MORE_VERTICAL}
        tabIndex={props.tabIndex}
        onClick={[onMenuHandler, true]}
      />
    </div>
  )
}

export const TracksList: Component<TracksListProps> = (props) => (
  <EntitiesListContainer {...props} entityName='track'>
    <VirtualContainer itemSize={{ height: 72 }} items={props.items}>
      {(itemProps) => (
        <TrackListItem
          {...itemProps}
          isPlayingItem={props.isPlayingItem}
          onItemClick={props.onItemClick}
          showIndex={props.showIndex}
          additionalMenuItems={props.additionalMenuItems}
        />
      )}
    </VirtualContainer>
  </EntitiesListContainer>
)
