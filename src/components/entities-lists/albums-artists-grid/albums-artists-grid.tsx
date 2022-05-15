import { createMemo, ParentComponent } from 'solid-js'
import { VirtualContainer } from '@minht11/solid-virtual-container'
import { useEntitiesStore } from '../../../stores/stores'
import * as styles from './albums-artists.css'
import { AlbumArtistGridItem } from './album-artist-grid-item'
import { Album, Artist } from '~/types/types'

export interface AlbumsArtistsGridProps {
  type: 'album' | 'artist'
  items: readonly string[]
}

const calculateItemSize = (crossAxisSize: number) => {
  const minWidth = crossAxisSize > 440 ? 200 : 160

  const count = Math.floor(crossAxisSize / minWidth)
  const width = Math.floor(crossAxisSize / count)

  const artworkSize = width - styles.SIDE_GAP

  return {
    width,
    height: artworkSize + styles.INFO_CONTAINER_HEIGHT + styles.BOTTOM_GAP,
  }
}

export const AlbumsArtistsGrid: ParentComponent<AlbumsArtistsGridProps> = (
  props,
) => {
  const [entities] = useEntitiesStore()

  const entitiesList = createMemo(() => {
    if (props.type === 'album') {
      return entities.albums
    }

    return entities.artists
  })

  return (
    <VirtualContainer
      itemSize={calculateItemSize}
      items={props.items}
      crossAxisCount={(measurements) =>
        Math.floor(measurements.container.cross / measurements.itemSize.cross)
      }
    >
      {(itemProps) => (
        <AlbumArtistGridItem
          {...itemProps}
          itemData={entitiesList()[itemProps.item] as Album | Artist}
        />
      )}
    </VirtualContainer>
  )
}
