import { Component, createMemo } from 'solid-js'
import { VirtualGridList } from '../../virtual/virtual'
import {
  EntitiesListContainer,
  BaseEntitiesListProps,
} from '../entities-list-container'
import { useEntitiesStore } from '../../../stores/stores'
import { INFO_CONTAINER_HEIGHT } from './albums-artists.css'
import { AlbumArtistGridItem } from './album-artist-grid-item'

export interface AlbumsArtistsGridProps extends BaseEntitiesListProps {
  type: 'album' | 'artist'
}

const calculateItemSize = (crossAxisSize: number) => {
  const minWidth = crossAxisSize > 560 ? 180 : 140
  const bottomPadding = 8

  const count = Math.floor(crossAxisSize / minWidth)
  const width = Math.floor(crossAxisSize / count)

  return {
    width,
    height: width + INFO_CONTAINER_HEIGHT - bottomPadding,
  }
}

export const AlbumsArtistsGrid: Component<AlbumsArtistsGridProps> = (props) => {
  const [entities] = useEntitiesStore()

  const entitiesList = createMemo(() => {
    if (props.type === 'album') {
      return entities.albums
    }

    return entities.artists
  })

  return (
    <EntitiesListContainer
      {...props}
      entityName={props.type === 'album' ? 'album' : 'artist'}
    >
      <VirtualGridList itemSize={calculateItemSize} items={props.items}>
        {(itemProps) => (
          <AlbumArtistGridItem
            {...itemProps}
            itemData={entitiesList()[itemProps.item]}
          />
        )}
      </VirtualGridList>
    </EntitiesListContainer>
  )
}
