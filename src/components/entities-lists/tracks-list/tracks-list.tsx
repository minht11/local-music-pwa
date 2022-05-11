import { Component, createMemo, createSignal, JSXElement, Show } from 'solid-js'
import { useNavigate } from 'solid-app-router'
import {
  VirtualContainer,
  VirtualItemProps,
} from '@minht11/solid-virtual-container'
import { Track } from '../../../types/types'
import { clx, formatTime, pluralize, useResizeObserver } from '../../../utils'
import { MusicImage } from '../../music-image/music-image'
import { MenuItem } from '../../menu/menu'
import { useEntitiesStore, usePlayerStore } from '../../../stores/stores'
import { useModals } from '../../modals/modals'
import { ListItem } from '~/components/list-item/listi-tem'
import * as styles from './tracks-list.css'

const UNKNOWN_ITEM_STRING = '<unknown>'

type EntitiesActions = ReturnType<typeof useEntitiesStore>[1]

export interface TracksListProps {
  items: readonly string[]
  fallback?: JSXElement
  onItemClick?: (item: Track, index: number) => void
  showIndex?: boolean
  isPlayingItem?: (item: Track, index: number) => boolean
  // TODO: Menu handling needs rewriting. One possible solution is predefined
  // options list.
  additionalMenuItems?: (item: Track, actions: EntitiesActions) => MenuItem[]
}

interface TracksListItemProps extends VirtualItemProps<string> {
  className: string
  showIndex?: boolean
  onItemClick?: (item: Track, index: number) => void
  isPlayingItem?: (item: Track, index: number) => boolean
  additionalMenuItems?: (item: Track, actions: EntitiesActions) => MenuItem[]
}

const artistsToString = (artists: readonly string[]) =>
  artists.length ? artists.join(', ') : UNKNOWN_ITEM_STRING

const TrackListItem = (props: TracksListItemProps) => {
  const navigate = useNavigate()
  const modals = useModals()
  const [entities, entitiesActions] = useEntitiesStore()
  const [, playerActions] = usePlayerStore()

  const [playerState] = usePlayerStore()

  const track = () => entities.tracks[props.item] as Track

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
            navigate(`/artist/${artists[0]}`)
          }
        },
      },
      trackItem.album && {
        name: 'View album',
        action: () => {
          navigate(`/album/${trackItem.album || ''}`)
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
      ...(props.additionalMenuItems?.(track(), entitiesActions) || []),
      {
        name: 'Remove from the library',
        action: () => {
          entitiesActions.removeTracks([trackId])
        },
      },
    ] as MenuItem[]

    return menuItems
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
    <ListItem
      isSelected={isItemPlaying()}
      onClick={onClickHandler}
      style={props.style}
      tabIndex={props.tabIndex}
      className={props.className}
      icon={
        <Show
          when={!props.showIndex}
          fallback={<div className={styles.firstColumn}>{props.index + 1}</div>}
        >
          <MusicImage
            item={track()}
            className={clx(styles.firstColumn, styles.artwork)}
          />
        </Show>
      }
      text={track().name}
      secondaryText={artistsToString(track().artists)}
      trailing={
        <>
          <div className={styles.album}>
            {track().album || UNKNOWN_ITEM_STRING}
          </div>

          <div className={styles.time}>{formatTime(track().duration)}</div>
        </>
      }
      getMenuItems={getMenuItems}
    />
  )
}

const TracksListContent = (props: TracksListProps) => {
  const [isWide, setIsWide] = createSignal(false)
  const [isNarrow, setIsNarrow] = createSignal(false)

  let containerEl!: HTMLDivElement
  useResizeObserver(
    () => containerEl,
    (entry) => {
      setIsWide(entry.contentRect.width > 800)
      setIsNarrow(entry.contentRect.width < 440)
    },
  )

  return (
    <div ref={containerEl} className={styles.container}>
      <VirtualContainer itemSize={{ height: 68 }} items={props.items}>
        {(itemProps) => (
          <TrackListItem
            {...itemProps}
            className={clx(
              !isWide() && styles.compact,
              isNarrow() && styles.narrow,
            )}
            isPlayingItem={props.isPlayingItem}
            onItemClick={props.onItemClick}
            showIndex={props.showIndex}
            additionalMenuItems={props.additionalMenuItems}
          />
        )}
      </VirtualContainer>
    </div>
  )
}

export const TracksList: Component<TracksListProps> = (props) => (
  <Show when={props.items.length} fallback={props.fallback}>
    <TracksListContent {...props} />
  </Show>
)
