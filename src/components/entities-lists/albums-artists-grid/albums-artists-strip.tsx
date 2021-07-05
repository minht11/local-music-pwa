import { Component, createMemo } from 'solid-js'
import {
  ScrollTargetContext,
  VirtualContainer,
} from '@minht11/solid-virtual-container'
import {
  EntitiesListContainer,
  BaseEntitiesListProps,
} from '../entities-list-container'
import { useEntitiesStore } from '../../../stores/stores'
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
          <VirtualContainer
            itemSize={calculateItemSize}
            items={props.items}
            direction='horizontal'
            crossAxisCount={(measurements) =>
              Math.floor(
                measurements.container.cross / measurements.itemSize.cross,
              )
            }
          >
            {(itemProps) => (
              <AlbumArtistGridItem
                {...itemProps}
                itemData={entitiesList()[itemProps.item]}
              />
            )}
          </VirtualContainer>
        </ScrollTargetContext.Provider>
      </div>
    </EntitiesListContainer>
  )
}
