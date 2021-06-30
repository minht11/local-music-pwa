import { Component, createMemo } from 'solid-js'
import { VirtualGridList } from '../../virtual/virtual'
import {
  EntitiesListContainer,
  BaseEntitiesListProps,
} from '../entities-list-container'
import { useEntitiesStore } from '../../../stores/stores'
import { ScrollTargetContext } from '../../virtual/virtual-content/scroll-target-context'
import { AlbumArtistGridItem } from './album-artist-grid-item'
import * as styles from './albums-artists.css'

export interface AlbumsArtistsGridProps extends BaseEntitiesListProps {
  type: 'album' | 'artist'
}

const calculateItemSize = () => {
  const width = 180

  return {
    width,
    height: width + styles.INFO_CONTAINER_HEIGHT,
  }
}

export const AlbumsArtistsStrip: Component<AlbumsArtistsGridProps> = (
  props,
) => {
  const [entities] = useEntitiesStore()

  const entitiesList = createMemo(() => {
    if (props.type === 'album') {
      return entities.albums
    }

    return entities.artists
  })

  let scrollTarget!: HTMLDivElement

  return (
    <EntitiesListContainer
      {...props}
      entityName={props.type === 'album' ? 'album' : 'artist'}
    >
      <div className={styles.scrollContainer} ref={scrollTarget}>
        <ScrollTargetContext.Provider value={{ scrollTarget }}>
          <VirtualGridList
            itemSize={calculateItemSize}
            items={props.items}
            direction='horizontal'
          >
            {(itemProps) => (
              <AlbumArtistGridItem
                {...itemProps}
                itemData={entitiesList()[itemProps.item]}
              />
            )}
          </VirtualGridList>
        </ScrollTargetContext.Provider>
      </div>
    </EntitiesListContainer>
  )
}
