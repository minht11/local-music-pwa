import { AnyAction } from 'redux'
import { ThunkActionResult } from '../index'
import { ActionTypes } from './types'
import { Track, TrackFileType } from '../../typings/interface'
import { addToast, removeToast } from '../toasts/actions'
import { removeTracks as removePlayerTracks } from '../player/actions'
import { categorizeTracks } from '../../utils/tracks-utils'

export const setTracks: ThunkActionResult = (tracks: Track[]) => (dispatch) => {
  dispatch(removePlayerTracks())
  const { albums, artists } = categorizeTracks(tracks)
  dispatch({
    type: ActionTypes.SET_TRACKS,
    payload: { tracks, albums, artists },
  })
}

// IMPORTANT. Currently it is not possible to pass NFS references to the worker or save them to IDB.
// https://bugs.chromium.org/p/chromium/issues/detail?id=955193
// This should be possible after chrome 78 lands.
export const importTracksIntoLibrary: ThunkActionResult = (files: TrackFileType[]) => (
  async (dispatch, getState) => {
    let successfulTracksAdded = 0
    const toastId = `library-${files.length}`
    const worker = new Worker('tracks-metadata-worker.js')
    worker.onmessage = ({ data }: MessageEvent) => {
      if (!data.finished) {
        successfulTracksAdded += 1
        dispatch(addToast({
          title: `Adding ${successfulTracksAdded} of ${files.length} tracks to the library`,
          id: toastId,
          spinner: true,
        }))
        return
      }

      // Get existing tracks
      const { library: { tracks } } = getState()
      // Remove holes which are left in case we werent able
      // to parse all tracks correctly.
      const newTracksUnfiltered = data.tracks as Track[]
      const newTracks = newTracksUnfiltered.filter(track => track) as Track[]

      // Filtering is done existing tracks because new tracks might
      // have been modified thus existing tracks became stale.
      const currentTracks = tracks.list.filter((currentTrack) => {
        const currentFileData = currentTrack.fileData
        const newTrack = newTracks.find(({ fileData }) => {
          if (fileData.type === currentFileData.type) {
            if (fileData.type === 'file') {
              // Checking if these are the same files is hard
              // and this doesnt work if file is renamed or modified
              return fileData.data.name === currentFileData.data.name
                // @ts-ignore https://github.com/microsoft/TypeScript/issues/32050
                && fileData.data.size === currentFileData.data.size
            }
            if (fileData.type === 'fileRef') {
              // Not sure if this actually works.
              // Revisit this later on when spec for NFS is more mature.
              // Or saving in IDB is fixed.
              return fileData.data === currentFileData.data
            }
          }
          return false
        })
        // Make ids the same so playlists doesn't change.
        if (newTrack) {
          newTrack.id = currentTrack.id
        }
        return !newTrack
      })

      const allTracks = [...currentTracks, ...newTracks]
      dispatch(setTracks(allTracks))

      dispatch(removeToast(toastId))
      dispatch(addToast({
        title: `Successfully added ${successfulTracksAdded} tracks`,
        id: `library-finished-adding-${files.length}`,
        duration: 4000,
        button: {
          title: 'Dismiss',
        },
      }))
    }
    worker.postMessage(files)
  }
)

export const removeTrack: ThunkActionResult = (track: Track) => (dispatch, getState) => {
  const state = getState()
  // TODO. Doing it like this disrupts player state.
  const tracks = state.library.tracks.list.filter(libTrack => libTrack !== track)
  dispatch(setTracks(tracks))
}

export const clearAllTracks = () => setTracks([])

export const search = (searchTerm: string): AnyAction => {
  const term = searchTerm.trim()
  return {
    type: ActionTypes.SEARCH,
    payload: term,
  }
}

export const sort = (type: string, sortBy: string): AnyAction => ({
  type: ActionTypes.SORT,
  payload: {
    type,
    sortBy,
  },
})

export const openPlaylistDialog = (track: Track): AnyAction => ({
  type: ActionTypes.TOGGLE_PLAYLIST_DIALOG,
  payload: {
    track,
    open: true,
  },
})

export const closePlaylistDialog = (): AnyAction => ({
  type: ActionTypes.TOGGLE_PLAYLIST_DIALOG,
  payload: {
    open: false,
  },
})


export const createNewPlaylist = (name: string): AnyAction => ({
  type: ActionTypes.CREATE_NEW_PLAYLIST,
  payload: {
    name,
    id: new Date().getTime(),
  },
})

export const addToPlaylist = (playlistId: number): AnyAction => ({
  type: ActionTypes.ADD_TRACK_TO_PLAYLIST,
  payload: playlistId,
})

export const removePlaylist = (playlistId: number): AnyAction => ({
  type: ActionTypes.REMOVE_PLAYLIST,
  payload: playlistId,
})
