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
  FileWrapper,
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

  const fileEquals = async (
    fileWrapperA: FileWrapper,
    fileWrapperB: FileWrapper,
  ) => {
    if (fileWrapperA.type === 'fileRef' && fileWrapperB.type === 'fileRef') {
      const fileA = fileWrapperA.file
      const fileB = fileWrapperB.file

      return fileA.name === fileB.name && fileA.isSameEntry(fileB)
    }

    if (fileWrapperA.type === 'file' && fileWrapperB.type === 'file') {
      const fileA = fileWrapperA.file
      const fileB = fileWrapperB.file

      // There is no good way to compare two files.
      return fileA.name === fileB.name && fileA.size === fileB.size
    }

    return false
  }

  const filterExistingTracks = async (newTracks: readonly UnknownTrack[]) => {
    const existingTracks = Object.values(state.tracks)

    const uniqueTracks: UnknownTrack[] = []
    for await (const newTrack of newTracks) {
      let foundTrackIndex = -1
      let i = 0
      for await (const existingTrack of existingTracks) {
        if (await fileEquals(newTrack.fileWrapper, existingTrack.fileWrapper)) {
          foundTrackIndex = i
          break
        }
        i += 1
      }

      if (foundTrackIndex === -1) {
        uniqueTracks.push(newTrack)
      } else {
        existingTracks.splice(foundTrackIndex, 1)
      }
    }

    return uniqueTracks
  }

  const addNewTracks = async (tracks: readonly UnknownTrack[]) => {
    const newTracks = await filterExistingTracks(tracks)

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
    const files = await getFilesFromDirectory([
      'aac',
      'mp3',
      'ogg',
      'wav',
      'flac',
      'm4a',
    ])

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
    } as const

    showToast({
      ...baseToastOptions,
      message: 'Preparing to import tracks to the library.',
      controls: false,
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
        controls: undefined,
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
    type: Exclude<MusicItemType, typeof MusicItemType.TRACK>,
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
