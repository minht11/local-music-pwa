import {
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

// Too many bugs in browsers, Safari 15 will support aspect-ratio,
// but it will probably ship with this bug and the fix will only come
// in a year, so just disable it for now. Making testing overall easier.
// TODO: enable this in 2022 :).
// https://bugzilla.mozilla.org/show_bug.cgi?id=1719273
// const supportsNativeCSSAspectRatio =
//   import.meta.env.PROD && CSS.supports('aspect-ratio: 1/1')
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

export const MusicImage = (props: MusicImageProps) => {
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

  const style = () => {
    const url = imageURL()
    return {
      'background-image': (url && `url(${url})`) || '',
    }
  }

  return (
    <div
      style={style()}
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
