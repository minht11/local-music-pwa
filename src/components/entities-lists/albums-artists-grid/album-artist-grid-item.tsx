import { useRouter } from '@rturnq/solid-router'
import { VirtualItemProps } from '@minht11/solid-virtual-container'
import { Album, Artist, MusicItemType } from '../../../types/types'
import { MusicImage } from '../../music-image/music-image'
import { BaseEntitiesListProps } from '../entities-list-container'
import { UNKNOWN_WORD_STRING } from '../../../types/constants'
import { clx } from '../../../utils'
import * as styles from './albums-artists.css'

type AlbumOrArtist = Album | Artist

export interface AlbumsArtistsGridProps extends BaseEntitiesListProps {
  type: 'album' | 'artist'
}

interface AlbumsArtistsGridItemProps extends VirtualItemProps<string> {
  itemData: AlbumOrArtist
}

export const AlbumArtistGridItem = (props: AlbumsArtistsGridItemProps) => {
  const router = useRouter()

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

    router.push(href)
  }

  return (
    <div
      style={props.style}
      className={styles.gridItem}
      tabIndex={props.tabIndex}
      onClick={onClickHandler}
      role='listitem'
    >
      <MusicImage
        item={props.itemData}
        className={clx(
          styles.artwork,
          !isAlbum(props.itemData) && styles.round,
        )}
      />
      <div className={styles.infoContainer}>
        <div className={styles.title}>{props.itemData.name}</div>
        <div>{artists()}</div>
      </div>
    </div>
  )
}
