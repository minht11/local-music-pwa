import { createMemo, JSXElement } from 'solid-js'
import { IconButton } from '~/components/icon-button/icon-button'
import { useEntitiesStore, usePlayerStore } from '~/stores/stores'
import * as styles from './info.css'

export const FavoriteButton = (): JSXElement => {
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
    <IconButton
      class={styles.infoFavoriteBtn}
      title={isFavorited() ? 'Remove from Favorites' : 'Add to Favorites'}
      icon={isFavorited() ? 'favorite' : 'favoriteOutline'}
      onClick={onFavoriteBtnClickHandler}
      disabled={!aTrack()}
    />
  )
}
