import { Component, createMemo, Show } from 'solid-js'
import { IconButton } from '../../../icon-button/icon-button'
import { IconType } from '../../../icon/icon'
import { clx } from '../../../../utils'
import { useEntitiesStore, usePlayerStore } from '../../../../stores/stores'
import * as styles from './info.css'

interface InfoProps {
  bigTitle?: boolean
  hideFavoriteBtn?: boolean
  className?: string | false
}

export const Info: Component<InfoProps> = (props) => {
  const [dataState, dataActions] = useEntitiesStore()
  const [playerState] = usePlayerStore()

  const aTrack = () => playerState.activeTrack

  const isFavorited = createMemo(() =>
    dataState.favorites.includes(playerState.activeTrackId),
  )

  const onFavoriteBtnClickHandler = () => {
    const trackId = aTrack()?.id
    if (!trackId) {
      return
    }

    if (isFavorited()) {
      dataActions.unfavoriteTrack(trackId)
    } else {
      dataActions.favoriteTrack(trackId)
    }
  }

  return (
    <div className={clx(styles.infoContainer, props.className)}>
      <Show when={aTrack()}>
        <div className={styles.info}>
          <div
            className={props.bigTitle ? styles.titleBig : styles.titleRegular}
          >
            {aTrack()?.name || 'Unknown'}
          </div>
          <div className={styles.secondaryInfoText}>
            {playerState.activeTrack?.artists.join(', ')}
          </div>
        </div>
        <Show when={!props.hideFavoriteBtn}>
          <IconButton
            className={styles.infoFavoriteBtn}
            title={isFavorited() ? 'Remove from Favorites' : 'Add to Favorites'}
            icon={isFavorited() ? IconType.FAVORITE : IconType.FAVORITE_OUTLINE}
            onClick={onFavoriteBtnClickHandler}
          />
        </Show>
      </Show>
    </div>
  )
}
