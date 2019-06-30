import { Reducer, AnyAction, combineReducers } from 'redux'
import { createSelector } from 'reselect'
import { cacheStorage } from '../index'
import { Track, Album, Artist } from '../../typings/interface'
import {
  ActionTypes,
  State,
  MainState,
  PlaylistsState,
  TracksState,
  AlbumsState,
  ArtistsState,
} from './types'

const initialMainState: MainState = {
  searchTerm: '',
}

const initialTracksState: TracksState = {
  sortBy: 'name',
  list: [],
}

const initialAlbumsState: AlbumsState = {
  sortBy: 'name',
  list: [],
}

const initialArtistsState: ArtistsState = {
  sortBy: 'name',
  list: [],
}

const initialPlaylistsState: PlaylistsState = {
  sortBy: '',
  isAddToDialogOpen: false,
  list: [{
    name: 'Favorites',
    id: 123456,
    tracksIds: [],
    duration: 0,
    icon: 'favorite',
  }]
}

const mainReducer: Reducer<MainState> = (state = initialMainState, action): MainState => {
  const { type, payload } = action
  
  switch (type) {
  case ActionTypes.SEARCH: {
    return { ...state, searchTerm: payload }
  }
  default:
    return state
  }
}

const tracksReducer: Reducer<TracksState> = (state = initialTracksState, action): TracksState => {
  const { type, payload } = action
  
  switch (type) {
  case ActionTypes.SET_TRACKS: {
    const { tracks } = payload
    cacheStorage.set('library-tracks', { list: tracks })
    return { ...state, list: tracks }
  }
  case ActionTypes.SORT: {
    const { type: sortType, sortBy } = payload
    if (sortType === 'tracks') {
      return { ...state, sortBy }
    }
    return state
  }
  default:
    return state
  }
}

const albumsReducer: Reducer<AlbumsState> = (state = initialAlbumsState, action): AlbumsState => {
  const { type, payload } = action
  
  switch (type) {
  case ActionTypes.SET_TRACKS: {
    const { albums } = payload
    cacheStorage.set('library-albums', { list: albums })
    return { ...state, list: albums }
  }
  case ActionTypes.SORT: {
    const { type: sortType, sortBy } = payload
    if (sortType === 'albums') {
      return { ...state, sortBy }
    }
    return state
  }
  default:
    return state
  }
}

const artistsReducer: Reducer<ArtistsState> = (state = initialArtistsState, action): ArtistsState => {
  const { type, payload } = action
  
  switch (type) {
  case ActionTypes.SET_TRACKS: {
    const { artists } = payload
    cacheStorage.set('library-artists', { list: artists })
    return { ...state, list: artists }
  }
  case ActionTypes.SORT: {
    const { type: sortType, sortBy } = payload
    if (sortType === 'artists') {
      return { ...state, sortBy }
    }
    return state
  }
  default:
    return state
  }
}

const playlistsReducer: Reducer<PlaylistsState> = (
state = initialPlaylistsState, action,
): PlaylistsState => {
  const { type, payload } = action

  switch (type) {
  case ActionTypes.SET_TRACKS: {
    const { tracks }: { tracks: Track[] } = payload
    let list = [...state.list].map((playlist) => {
      playlist.tracksIds = playlist.tracksIds.filter((trackId) => {
        tracks.find((track) => track.id === trackId)
      })
      return playlist
    })
    cacheStorage.set('library-playlists', { list })
    return { ...state, list }
  }
  case ActionTypes.SORT: {
    const { type: sortType, sortBy } = payload
    if (sortType === 'playlists') {
      return { ...state, sortBy }
    }
    return state
  }
  case ActionTypes.TOGGLE_PLAYLIST_DIALOG: {
    return { ...state,
      isAddToDialogOpen: payload.open,
      potentialTrackToBeAdded: payload.track,
    }
  }
  case ActionTypes.CREATE_NEW_PLAYLIST: {
    const list = [ ...state.list, {
        name: payload.name,
        id: payload.id,
        icon: 'playlist',
        duration: 0,
        tracksIds: [],
      }
    ]
    cacheStorage.set('library-playlists', { list })
    return { ...state, list }
  }
  case ActionTypes.ADD_TRACK_TO_PLAYLIST: {
    if (state.potentialTrackToBeAdded) {
      const playlist = state.list.find((playlist) => playlist.id === payload)
      if (playlist) {
        playlist.tracksIds.push(state.potentialTrackToBeAdded.id)
        const list = [ ...state.list ]
        cacheStorage.set('library-playlists', { list })
        return { ...state, list }
      }
    }
    return state
  }
  case ActionTypes.REMOVE_PLAYLIST: {
    const list = state.list.filter(playlist => playlist.id !== payload)
    cacheStorage.set('library-playlists', { list })
    return { ...state, list }
  }
  default:
    return state
  }
}

export const reducer = combineReducers<State>({
  main: mainReducer,
  tracks: tracksReducer,
  albums: albumsReducer,
  artists: artistsReducer,
  playlists: playlistsReducer,
})

export const searchTermSelector = (state: State) => state.main.searchTerm.toLowerCase()

const tracksSelector = (state: State) => state.tracks.list
const artistsSelector = (state: State) => state.artists.list
const albumsSelector = (state: State) => state.albums.list

export const filteredTracks = createSelector(
  [tracksSelector, searchTermSelector],
  (tracks, searchTerm) => (
    tracks.filter((track) => {
      if (searchTerm !== '') {
        const { name, album, artist } = track
        const isAlbumName = album ? album.toLowerCase().includes(searchTerm) : false
        const isArtistName = artist ? artist.toLowerCase().includes(searchTerm) : false
        return name.toLowerCase().includes(searchTerm) || isAlbumName || isArtistName
      }
      return true
    })
  ),
)

export const filteredArtists = createSelector(
  [artistsSelector, searchTermSelector],
  (artists, searchTerm) => (
    artists.filter((artist) => {
      if (searchTerm !== '') {
        return artist.name.toLowerCase().includes(searchTerm)
      }
      return true
    })
  ),
)

export const filteredAlbums = createSelector(
  [albumsSelector, searchTermSelector],
  (albums, searchTerm) => (
    albums.filter((album) => {
      if (searchTerm !== '') {
        album.name.toLowerCase().includes(searchTerm)
      }
      return true
    })
  ),
)

export const songsSortBySelector = (state: State) => state.tracks.sortBy
export const artistsSortBySelector = (state: State) => state.artists.sortBy
export const albumsSortBySelector = (state: State) => state.albums.sortBy

type LibraryItem = Track | Artist | Album
type LibraryListItem = Track[] | Artist[] | Album[]

const sort = (list: LibraryListItem, sortBy: string) => list.sort(
  (a: LibraryItem, b: LibraryItem) => {
    // Typescript is not clever enough to do type infering correctly here.
    // types in this case. Possibly try to fix this later.
    // @ts-ignore
    let keyA = a[sortBy]
    // @ts-ignore
    let keyB = b[sortBy]
    if (keyA && keyB) {
      if (typeof keyA === 'number' || typeof keyB === 'number') {
        return (keyA as number) - (keyB as number)
      }
      if (Array.isArray(keyA)) {
        keyA = keyA.toString()
      }
      if (Array.isArray(keyB)) {
        keyB = keyB.toString()
      }
      keyA = (keyA as string).toLowerCase()
      keyB = (keyB as string).toLowerCase()
      if (keyA < keyB) {
        return -1
      }
      if (keyA > keyB) {
        return 1
      }
    } else if (keyA) {
      return -1
    } else if (keyB) {
      return 1
    }

    return 0
  },
)

export const sortedAndFilteredTracks = createSelector(
  [filteredTracks, songsSortBySelector],
  (track, sortBy) => sort(track, sortBy) as Track[],
)

export const sortedAndFilteredArtists = createSelector(
  [artistsSelector, artistsSortBySelector],
  (artists, sortBy) => sort(artists, sortBy) as Artist[],
)

export const sortedAndFilteredAlbums = createSelector(
  [filteredAlbums, albumsSortBySelector],
  (albums, sortBy) => sort(albums, sortBy) as Album[],
)