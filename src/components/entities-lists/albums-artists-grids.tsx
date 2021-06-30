import { Component } from 'solid-js'
import {
  AlbumsArtistsGrid,
  AlbumsArtistsGridProps as AAGridProps,
} from './albums-artists-grid/albums-artists-grid'
import { AlbumsArtistsStrip } from './albums-artists-grid/albums-artists-strip'

type AlbumsArtistsGridProps = Omit<AAGridProps, 'type'>

export const ArtistsGrid: Component<AlbumsArtistsGridProps> = (props) => (
  <AlbumsArtistsGrid {...props} type='artist' />
)

export const AlbumsGrid: Component<AlbumsArtistsGridProps> = (props) => (
  <AlbumsArtistsGrid {...props} type='album' />
)

export const ArtistsStrip: Component<AlbumsArtistsGridProps> = (props) => (
  <AlbumsArtistsStrip {...props} type='artist' />
)

export const AlbumsStrip: Component<AlbumsArtistsGridProps> = (props) => (
  <AlbumsArtistsStrip {...props} type='album' />
)
