import { batch } from 'solid-js'
import { createStore, produce, SetStoreFunction } from 'solid-js/store'
import { nanoid } from 'nanoid'
import { getFilesFromDirectory } from '../../helpers/file-system'
import { tracksParser } from '../../helpers/tracks-file-parser/tracks-file-parser'
import {
  Track,
  Album,
  Artist,
  Playlist,
  MusicItemType,
  UnknownTrack,
} from '../../types/types'
import { UNKNOWN_ITEM_ID } from '../../types/constants'
import { useToast } from '../../components/toasts/toasts'
import { createPlaylistsActions } from './create-playlists-actions'

export interface State {
  tracks: {
    [trackId: string]: Track
  }
  albums: {
    [albumId: string]: Album
  }
  artists: {
    [artistId: string]: Artist
  }
  playlists: {
    [playlistId: string]: Playlist
  }
  favorites: string[]
}

export type SetState = SetStoreFunction<State>

export const createEntitiesStore = () => {
  const [state, setState] = createStore<State>({
    tracks: {},
    albums: {},
    artists: {},
    playlists: {},
    favorites: [],
  })

  const playlistsActions = createPlaylistsActions(setState)

  const toasts = useToast()
  const showToast = toasts.show

  const removeTracks = (trackIds: string[]) => {
    batch(() => {
      for (const trackId of trackIds) {
        const track = state.tracks[trackId]

        if (track) {
          const filterIds = (ids: readonly string[]) =>
            ids.filter((id) => id !== trackId)

          const filterIdsParams = ['trackIds', filterIds] as const

          setState('tracks', trackId, undefined as unknown as Track)
          setState('albums', track.album || UNKNOWN_ITEM_ID, ...filterIdsParams)

          for (const artistId of track.artists || [UNKNOWN_ITEM_ID]) {
            setState('artists', artistId, ...filterIdsParams)
          }

          setState('favorites', filterIds)
        }
      }

      for (const playlist of Object.values(state.playlists)) {
        const filteredIds = playlist.trackIds.filter(
          (id) => !trackIds.includes(id),
        )
        setState('playlists', playlist.id, 'trackIds', filteredIds)
      }
    })
  }

  // Returns undefined if track already exists or the supplied track.
  const checkIfTrackIsNew = async (newTrack: UnknownTrack) => {
    const existingTracks = Object.values(state.tracks)

    const newTrackFile = newTrack.fileWrapper
    // We want search to run sequently here.
    for await (const { fileWrapper: existingTrackFile } of existingTracks) {
      if (
        existingTrackFile.type === 'fileRef' &&
        newTrackFile.type === 'fileRef'
      ) {
        if (await existingTrackFile.file.isSameEntry(newTrackFile.file)) {
          return undefined
        }
      }

      if (existingTrackFile.type === 'file' && newTrackFile.type === 'file') {
        const existingFile = existingTrackFile.file
        const newFile = newTrackFile.file

        // There is no good way to compare two files.
        const trackAlreadyExists =
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size

        if (trackAlreadyExists) {
          return undefined
        }
      }
    }

    return newTrack
  }

  const addNewTracks = async (tracks: readonly UnknownTrack[]) => {
    // We want independent track checking to occur in parallel.
    const newTracksWithHoles = await Promise.all(tracks.map(checkIfTrackIsNew))

    const newTracks = newTracksWithHoles.filter(Boolean)

    setState(
      produce((s: State) => {
        for (const track of newTracks) {
          const id = nanoid()
          s.tracks[id] = <Track>{
            ...track,
            id,
            type: MusicItemType.TRACK,
          }
        }

        const { albums } = s
        const { artists } = s

        for (const track of Object.values(s.tracks)) {
          const trackArtists = track.artists
          const trackId = track.id

          // Albums and Artists names and ids are the same.
          const albumId = track.album ?? UNKNOWN_ITEM_ID

          const album = (albums[albumId] ||= {
            type: MusicItemType.ALBUM,
            id: albumId,
            name: albumId,
            artists: [],
            trackIds: [],
          })

          if (albumId !== UNKNOWN_ITEM_ID) {
            // The preveous tracks might not have had these values.
            album.image ||= track.image
            album.year ||= track.year
          }

          if (!album.trackIds.includes(trackId)) {
            album.trackIds.push(trackId)
          }

          for (const artist of trackArtists) {
            if (!album.artists.includes(artist)) {
              album.artists.push(artist)
            }
          }

          const artistsNames =
            trackArtists.length > 0 ? trackArtists : [UNKNOWN_ITEM_ID]
          for (const artistId of artistsNames) {
            const artist = (artists[artistId] ||= {
              type: MusicItemType.ARTIST,
              id: artistId,
              name: artistId,
              trackIds: [],
            })

            if (!artist.trackIds.includes(trackId)) {
              artist.trackIds.push(trackId)
            }
          }
        }
      }),
    )
  }

  const importTracks = async () => {
    const files = await getFilesFromDirectory(['mp3'])

    // User canceled directory picker.
    if (!files) {
      return
    }

    const toastId = `it-${new Date().getTime()}`
    if (files.length < 1) {
      showToast({
        id: toastId,
        message: 'Selected directory does not contain any tracks.',
      })
      return
    }

    const baseToastOptions = {
      id: toastId,
      duration: false,
      controls: false,
    } as const

    showToast({
      ...baseToastOptions,
      message: 'Preparing to import tracks to the library.',
    })

    try {
      const newTracks = await tracksParser(
        files,
        (successfullyImportedCount) => {
          showToast({
            ...baseToastOptions,
            message: `Importing tracks to the library. ${successfullyImportedCount} of ${files.length}`,
            controls: 'spinner',
          })
        },
      )

      batch(() => {
        addNewTracks(newTracks)
        showToast({
          ...baseToastOptions,
          message: `Successfully imported or uptated ${newTracks.length} tracks to the library.`,
          duration: 8000,
          controls: undefined,
        })
      })
    } catch (err) {
      console.error(err)
      showToast({
        ...baseToastOptions,
        message:
          'An unknown error has occurred while importing tracks to the library.',
      })
    }
  }

  const clearData = () => {
    showToast({
      message: 'Library cleared',
      id: 'removed-all-tracks',
    })
    setState({
      tracks: {},
      albums: {},
      artists: {},
      playlists: {},
    })
  }

  const remove = (
    id: string,
    type: Exclude<MusicItemType, MusicItemType.TRACK>,
  ) => {
    const pathMap = {
      [MusicItemType.ALBUM]: 'albums',
      [MusicItemType.ARTIST]: 'artists',
      [MusicItemType.PLAYLIST]: 'playlists',
    } as const

    const path = pathMap[type]

    setState(path, id, undefined as unknown as Album)

    if (path !== 'playlists') {
      const ids = state[path][id].trackIds
      removeTracks(ids)
    }
  }

  const actions = {
    ...playlistsActions,
    removeTracks,
    remove,
    importTracks,
    clearData,
  }

  return [
    state,
    actions,
    [
      {
        key: 'data-tracks',
        selector: () => state.tracks,
        load: (tracks: State['tracks']) => setState({ tracks }),
      },
      {
        key: 'data-albums',
        selector: () => state.albums,
        load: (albums: State['albums']) => setState({ albums }),
      },
      {
        key: 'data-artists',
        selector: () => state.artists,
        load: (artists: State['artists']) => setState({ artists }),
      },
      {
        key: 'data-playlists',
        selector: () => state.playlists,
        load: (playlists: State['playlists']) => setState({ playlists }),
      },
      {
        key: 'data-favorites',
        selector: () => state.favorites,
        load: (favorites: State['favorites']) => setState({ favorites }),
      },
    ],
  ] as const
}
