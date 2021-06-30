import { nanoid } from 'nanoid'
import { Playlist, MusicItemType } from '../../types/types'
import { SetState } from './create-entities-store'

export const createPlaylistsActions = (setState: SetState) => {
  const createNewPlaylist = (name: string, trackIds: string[] = []) => {
    const newPlaylist: Playlist = {
      type: MusicItemType.PLAYLIST,
      id: nanoid(),
      name,
      dateCreated: new Date().getTime(),
      trackIds,
    }

    setState('playlists', newPlaylist.id, newPlaylist)
  }

  const renamePlaylist = (id: string, name: string) => {
    setState('playlists', id, 'name', name)
  }

  const mergeToUniqueArray = <T>(a: readonly T[], b: readonly T[]): T[] => {
    const uniqueItemsSet = new Set([...a, ...b])
    return [...uniqueItemsSet]
  }

  const addTracksToPlaylist = (
    playlistId: string,
    tracksIds: readonly string[],
  ) => {
    setState('playlists', playlistId, 'trackIds', (ids) =>
      mergeToUniqueArray(ids, tracksIds),
    )
  }

  const removeTracksFromPlaylist = (
    playlistId: string,
    tracksIds: readonly string[],
  ) => {
    setState('playlists', playlistId, 'trackIds', (ids) =>
      ids.filter((id) => !tracksIds.includes(id)),
    )
  }

  const favoriteTrack = (trackId: string) => {
    setState('favorites', (ids) => mergeToUniqueArray(ids, [trackId]))
  }

  const unfavoriteTrack = (trackId: string) => {
    setState('favorites', (existingIds) =>
      existingIds.filter((id) => id !== trackId),
    )
  }

  return {
    createNewPlaylist,
    renamePlaylist,
    addTracksToPlaylist,
    removeTracksFromPlaylist,
    favoriteTrack,
    unfavoriteTrack,
  }
}
