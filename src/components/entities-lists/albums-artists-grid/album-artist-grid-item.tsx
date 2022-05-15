import { JSXElement } from 'solid-js'
import { useNavigate } from 'solid-app-router'
import { VirtualItemProps } from '@minht11/solid-virtual-container'
import { Album, Artist, MusicItemType } from '../../../types/types'
import { MusicImage } from '../../music-image/music-image'
import { UNKNOWN_WORD_STRING } from '../../../types/constants'
import * as styles from './albums-artists.css'

type AlbumOrArtist = Album | Artist

export interface AlbumsArtistsGridProps {
  type: 'album' | 'artist'
}

interface AlbumsArtistsGridItemProps extends VirtualItemProps<string> {
  itemData: AlbumOrArtist
}

export const AlbumArtistGridItem = (
  props: AlbumsArtistsGridItemProps,
): JSXElement => {
  const navigate = useNavigate()

  const isAlbum = (item: AlbumOrArtist): item is Album =>
    item.type === MusicItemType.ALBUM

  const artists = () => {
    const item = props.itemData
    if (isAlbum(item)) {
      const { artists: aList } = item
      return aList.length ? aList.join(' ,') : UNKNOWN_WORD_STRING
    }

    return ''
  }

  const onClickHandler = () => {
    const item = props.itemData
    const route = isAlbum(item) ? 'album' : 'artist'
    const href = `/${route}/${encodeURIComponent(item.id)}`

    navigate(href)
  }

  return (
    <div
      style={props.style}
      class={styles.gridItem}
      tabIndex={props.tabIndex}
      onClick={onClickHandler}
      role='listitem'
    >
      <div class={styles.gridItemContent}>
        <MusicImage item={props.itemData} class={styles.artwork} />
        <div class={styles.infoContainer}>
          <div class={styles.title}>{props.itemData.name}</div>
          <div>{artists()}</div>
        </div>
      </div>
    </div>
  )
}
