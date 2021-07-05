import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  Show,
  JSX,
  useContext,
} from 'solid-js'
import { ImageType, MusicItemType } from '../../types/types'
import { FAVORITES_ID } from '../../types/constants'
import { Icon, IconType } from '../icon/icon'
import { MusicImagesContext } from './data-context'
import { clx } from '../../utils'
import * as styles from './music-image.css'

export interface MusicImageProps {
  className?: string
  item?: {
    id: string
    type: MusicItemType
    image?: ImageType
  }
  ref?: JSX.CustomAttributes<HTMLDivElement>['ref']
}

// const supportsNativeCSSAspectRatio = CSS.supports('aspect-ratio: 1/1')
const supportsNativeCSSAspectRatio = false

const getIcon = (item?: MusicImageProps['item']) => {
  if (!item) {
    return null
  }

  switch (item.type) {
    case MusicItemType.TRACK:
      return IconType.ALBUM
    case MusicItemType.ALBUM:
      return IconType.ALBUM
    case MusicItemType.ARTIST:
      return IconType.PERSON
    case MusicItemType.PLAYLIST: {
      if (item.id === FAVORITES_ID) {
        return IconType.FAVORITE
      }
      return IconType.PLAYLIST
    }
    default:
      return IconType.ALBUM
  }
}

export const MusicImage: Component<MusicImageProps> = (props) => {
  const context = useContext(MusicImagesContext)

  const [imageURL, setImgURL] = createSignal<string | null>(null)
  // Maybe instead of symbol 'item.id' could be used in the future.
  const userKey = Symbol('key')

  createEffect(() => {
    const { item } = props
    const imageBlob = item && item.type !== MusicItemType.PLAYLIST && item.image

    setImgURL((imageBlob && context?.get(imageBlob, userKey)) || null)

    onCleanup(() => {
      if (imageBlob) {
        context?.release(imageBlob, userKey)
      }
    })
  })

  return (
    <div
      style={(imageURL() && `background-image: url(${imageURL()})`) || ''}
      className={clx(
        styles.musicImage,
        props.className,
        supportsNativeCSSAspectRatio && styles.aspectRatio,
      )}
      ref={props.ref}
    >
      <Show when={!supportsNativeCSSAspectRatio}>
        <svg
          aria-hidden='true'
          className={styles.legacyAspectImg}
          viewBox='0 0 1 1'
          xmlns='http://www.w3.org/2000/svg'
        ></svg>
      </Show>
      <Show when={imageURL() === null && getIcon(props.item)}>
        {(icon) => <Icon icon={icon} className={styles.musicIcon} />}
      </Show>
    </div>
  )
}
