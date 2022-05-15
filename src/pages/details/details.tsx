import { createMemo, For, lazy, Show } from 'solid-js'
import { useNavigate, useParams } from 'solid-app-router'
import { MusicItemType } from '~/types/types'
import { TracksList } from '~/components/entities-lists/tracks-list/tracks-list'
import { IconButton } from '~/components/icon-button/icon-button'
import { DetailsPageConfig } from './config'
import { useMenu } from '~/components/menu/menu'
import { usePlayerStore, useEntitiesStore } from '~/stores/stores'
import { State as EntitiesState } from '~/stores/entities/create-entities-store'
import { FAVORITES_ID, UNKNOWN_ITEM_ID } from '~/types/constants'
import { useModals } from '~/components/modals/modals'
import { Icon } from '~/components/icon/icon'
import { MessageBanner } from '~/components/message-banner/message-banner'
import { sortByKey } from '~/utils'
import { Scaffold } from '~/components/scaffold/scaffold'
import { MusicImage } from '~/components/music-image/music-image'
import * as styles from './details.css'

const NotFound = lazy(() => import('../not-found/not-found'))

const DetailsPage = (props: DetailsPageConfig) => {
  const [entities, entitiesActions] = useEntitiesStore()
  const [, playerActions] = usePlayerStore()

  const menu = useMenu()
  const modals = useModals()

  const params = useParams()
  const navigate = useNavigate()

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
    const itemId = decodeURIComponent(params.itemId || '')

    const itemsMap = itemsSelector()
    const item =
      itemsMap[itemId] ||
      props.itemSelector?.(itemId, entities as EntitiesState)

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
        {
          name: 'Remove from the library',
          action: () => {
            entitiesActions.remove(data.item.id, props.type)
            navigate('/')
          },
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

  const data = dataMemo as () => NonNullable<ReturnType<typeof dataMemo>>

  return (
    <Show when={dataMemo()} fallback={<NotFound />}>
      <Scaffold
        title={`${data().item.name || ''}`}
        topBar={props.title}
        scrollable
      >
        <section class={styles.content}>
          <MusicImage item={data().item} class={styles.musicImage} />
          <div class={styles.details}>
            <div class={styles.secondary}>{props.label?.(data().item)}</div>
            <h1 class={styles.title}>{data().item.name}</h1>

            <div class={styles.secondary}>
              <For each={props.info?.(data().item) || []}>
                {(infoItem) => <div>{infoItem}</div>}
              </For>
            </div>

            <div class={styles.actions}>
              <button
                class={styles.tonalButton}
                onClick={onPlayHandler}
                disabled={!dataMemo()!.trackIds.length}
              >
                <Icon icon='play' />
                Play
              </button>
              <IconButton
                icon='moreVertical'
                title='Add to..'
                onClick={onAddToHandler}
              />
            </div>
          </div>
        </section>

        <TracksList
          showIndex={data().atLeastOneTrackHasNo}
          items={data().trackIds}
          additionalMenuItems={(track, actions) =>
            props.additionalTrackMenuItems?.(data().item, track, actions) || []
          }
          fallback={<MessageBanner message='Nothing here' />}
        />
      </Scaffold>
    </Show>
  )
}

export default DetailsPage
