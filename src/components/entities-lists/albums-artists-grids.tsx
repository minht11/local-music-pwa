import { VoidComponent } from 'solid-js'
import {
  AlbumsArtistsGrid,
  AlbumsArtistsGridProps as AAGridProps,
} from './albums-artists-grid/albums-artists-grid'

type AlbumsArtistsGridProps = Omit<AAGridProps, 'type'>

export const ArtistsGrid: VoidComponent<AlbumsArtistsGridProps> = (props) => (
  <AlbumsArtistsGrid {...props} type='artist' />
)

export const AlbumsGrid: VoidComponent<AlbumsArtistsGridProps> = (props) => (
  <AlbumsArtistsGrid {...props} type='album' />
)
