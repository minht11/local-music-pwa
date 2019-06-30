import {
  Track,
  Album,
  Artist,
  Playlist,
} from '../../typings/interface'

export type SongsSortOptions = 'name' | 'artist' | 'album' | 'year' | 'duration'
export type AlbumsSortOptions = 'name' | 'artist' | 'year' | 'duration'
export type ArtistsSortOptions = 'name' | 'duration'

export interface MainState {
  readonly searchTerm: string,
}

export interface TracksState {
  list: Track[],
  sortBy: SongsSortOptions,
}

export interface AlbumsState {
  list: Album[],
  sortBy: SongsSortOptions,
}

export interface ArtistsState {
  list: Artist[],
  sortBy: SongsSortOptions,
}

export interface PlaylistsState {
  list: Playlist[],
  sortBy: string,
  isAddToDialogOpen: boolean,
  potentialTrackToBeAdded?: Track,
}

export interface State {
  readonly main: MainState,
  readonly tracks: TracksState,
  readonly albums: AlbumsState,
  readonly artists: ArtistsState,
  readonly playlists: PlaylistsState,
}

export const enum ActionTypes {
  SET_TRACKS = '@@library/SET_TRACKS',
  SEARCH = '@@library/SEARCH',
  SORT = '@@library/SORT',
  TOGGLE_PLAYLIST_DIALOG = '@@library/TOGGLE_PLAYLIST_DIALOG',
  CREATE_NEW_PLAYLIST = '@@library/CREATE_NEW_PLAYLIST',
  ADD_TRACK_TO_PLAYLIST = '@@library/ADD_TRACK_TO_PLAYLIST',
  REMOVE_PLAYLIST = '@@library/REMOVE_PLAYLIST',
}
