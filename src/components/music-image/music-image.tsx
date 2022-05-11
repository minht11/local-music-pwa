import { onCleanup, Show, JSX, useContext, createMemo } from 'solid-js'
import { ImageType, MusicItemType } from '~/types/types'
import { FAVORITES_ID } from '~/types/constants'
import { ICON_PATHS } from '../icon/icon-paths'
import { MusicImagesContext } from './data-context'
import { clx } from '~/utils'
import * as styles from './music-image.css'

export interface MusicImageProps {
  className?: string
  item?: {
    id: string
    type: MusicItemType
    image?: ImageType
  }
}

const getIconType = (item?: MusicImageProps['item']) => {
  switch (item?.type) {
    case MusicItemType.ARTIST:
      return 'person'
    case MusicItemType.PLAYLIST: {
      if (item.id === FAVORITES_ID) {
        return 'favorite'
      }
      return 'playlist'
    }
    default:
      return 'album'
  }
}

export const MusicImage = (props: MusicImageProps): JSX.Element => {
  const context = useContext(MusicImagesContext)

  // Maybe instead of symbol 'item.id' could be used in the future.
  const userKey = Symbol('key')

  const item = () => props.item

  const imageURL = createMemo(() => {
    const itm = item()
    const imageBlob = itm && itm.type !== MusicItemType.PLAYLIST && itm.image

    onCleanup(() => {
      if (imageBlob) {
        context?.release(imageBlob, userKey)
      }
    })

    return (imageBlob && context?.get(imageBlob, userKey)) || null
  })

  const style = () => {
    const url = imageURL()
    return {
      'background-image': (url && `url(${url})`) || '',
    }
  }

  const path = () => {
    const itm = item()
    if (!itm) {
      return ''
    }

    return ICON_PATHS[getIconType(itm)]
  }

  return (
    // Use svg because it keeps it's aspect ratio.
    <svg
      style={style()}
      className={clx(
        styles.musicImage,
        props.className,
        item()?.type === MusicItemType.ARTIST && styles.round,
      )}
      viewBox='-2 -2 28 28'
      aria-label='Artwork'
    >
      <Show when={imageURL() === null}>
        <path d={path()} />
      </Show>
    </svg>
  )
}
