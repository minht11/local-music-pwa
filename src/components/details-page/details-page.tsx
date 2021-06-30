import { createMemo, For, Show, untrack } from 'solid-js'
import { useRoute, useRouter } from '@rturnq/solid-router'
import { MusicItemType } from '../../types/types'
import { AppScrollContainer } from '../app-scroll-container/app-scroll-container'
import { NotFound } from '../not-found/not-found'
import { TracksList } from '../entities-lists/tracks-list/tracks-list'
import { MusicImage } from '../music-image/music-image'
import { IconButton, IconType } from '../icon-button/icon-button'
import { DetailsPageConfig } from './details-pages-config'
import { useMenu } from '../menu/menu'
import { usePlayerStore, useEntitiesStore } from '../../stores/stores'
import {
  APP_TITLE_POSTFIX,
  FAVORITES_ID,
  UNKNOWN_ITEM_ID,
} from '../../types/constants'
import { useModals } from '../modals/modals'
import { Icon } from '../icon/icon'
import { MessageBanner } from '../message-banner/message-banner'
import * as styles from './details-page.css'
import { sortByKey } from '../../utils'
import { useDocumentTitle } from '../../helpers/hooks/use-document-title'

export const DetailsPage = (props: DetailsPageConfig) => {
  const [entities, entitiesActions] = useEntitiesStore()
  const [, playerActions] = usePlayerStore()

  const menu = useMenu()
  const modals = useModals()

  const router = useRouter()
  const route = useRoute()

  const itemsSelector = () => {
    switch (props.type) {
      case MusicItemType.ALBUM:
        return entities.albums
      case MusicItemType.ARTIST:
        return entities.artists
      case MusicItemType.PLAYLIST:
        return entities.playlists
      default:
        throw new Error('Wrong item type')
    }
  }

  const dataMemo = createMemo(() => {
    const itemId = decodeURIComponent(route.params.id || '')

    const itemsMap = itemsSelector()
    const item = itemsMap[itemId] || props.itemSelector?.(itemId, entities)

    if (!item) {
      return null
    }

    let atLeastOneTrackHasNo = false
    let tracks = Object.values(entities.tracks).filter((track) => {
      if (item.trackIds.includes(track.id)) {
        if (
          props.showTrackIndex &&
          !atLeastOneTrackHasNo &&
          track.trackNo !== undefined
        ) {
          atLeastOneTrackHasNo = true
        }
        return true
      }
      return false
    })

    const { sortTrackByKey } = props

    if (sortTrackByKey) {
      tracks = sortByKey(tracks, sortTrackByKey)
    }

    const trackIds = tracks.map((t) => t.id)

    return {
      isUnkownOrFavorite: itemId === UNKNOWN_ITEM_ID || itemId === FAVORITES_ID,
      item,
      trackIds,
      atLeastOneTrackHasNo,
    }
  })

  useDocumentTitle(() => `${dataMemo()?.item.name || ''} ${APP_TITLE_POSTFIX}`)

  const onPlayHandler = () => {
    playerActions.playTrack(0, dataMemo()?.trackIds || [])
  }

  const onAddToHandler = (e: MouseEvent) => {
    const data = dataMemo()

    if (!data) {
      return
    }

    const { trackIds } = data

    menu.show(
      [
        {
          name: 'Add to queue',
          action: () => playerActions.addToQueue(trackIds),
        },
        {
          name: 'Add to playlist',
          action: () => modals.addToPlaylists.show({ trackIds }),
        },
      ],
      e.target as HTMLElement,
      {
        anchor: true,
        preferredAlign: {
          horizontal: 'right',
        },
      },
    )
  }

  const onRemoveHandler = () => {
    const data = dataMemo()

    if (data) {
      entitiesActions.remove(data.item.id, props.type)
      router.push('/')
    }
  }

  return (
    <Show when={dataMemo()} fallback={NotFound}>
      {(data) => (
        <AppScrollContainer
          headerProps={{ title: props.title }}
          classNames={{
            container: styles.page,
            scrollContainer: styles.scrollContainer,
          }}
        >
          <section className={styles.infoHeader}>
            <MusicImage item={data.item} className={styles.artwork} />
            <div className={styles.details}>
              <div className={styles.title}>{data.item.name}</div>
              <For each={props.info?.(data.item) || []}>
                {(infoItem) => (
                  <div className={styles.singleLine}>{infoItem}</div>
                )}
              </For>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.playButton}
                onClick={onPlayHandler}
                disabled={!data.trackIds.length}
              >
                Play <Icon icon={IconType.PLAY} />
              </button>
              <IconButton
                icon={IconType.PLUS}
                title='Add to..'
                onClick={onAddToHandler}
              />
              {untrack(() => props.actions?.(data.item))}
              <IconButton
                disabled={data.isUnkownOrFavorite}
                icon={IconType.DELETE}
                title='Remove from the library'
                onClick={onRemoveHandler}
              />
            </div>
          </section>

          <TracksList
            showIndex={data.atLeastOneTrackHasNo}
            items={data.trackIds}
            fallback={<MessageBanner message={'Nothing here'} />}
            additionalMenuItems={(track, actions) =>
              props.additionalTrackMenuItems?.(data.item, track, actions) || []
            }
          />
        </AppScrollContainer>
      )}
    </Show>
  )
}
