import { deleteDB, openDB } from 'idb'

export const V1_LEGACY_DB_NAME = 'APP_DATA-1'

type V1LegacyTrackFileWrapper = {
    type: 'fileRef'
    file: FileSystemFileHandle
} | {
    type: 'file'
    file: File
}

/**
 * This types does not contain all of the fields that exist,
 * but only those needed for migration.
 **/
interface V1LegacyTrack {
    id: string
    fileWrapper: V1LegacyTrackFileWrapper
}

/**
 * This types does not contain all of the fields that exist,
 * but only those needed for migration.
 **/
interface V1LegacyPlaylist {
    dateCreated: number
    id: string
    name: string
    trackIds: string[]
}

type V1LegacyDatabaseKey = 'tracks' | 'playlists' | 'favorites'
type V1LegacyDatabaseDataMap = {
    tracks: Record<string, V1LegacyTrack>
    playlists: Record<string, V1LegacyPlaylist>
    favorites: string[]
}

/** Database used in V1 version of the app */
export const getV1LegacyDatabase = () => openDB<V1LegacyDatabaseKey>(V1_LEGACY_DB_NAME, 1)

export const getV1LegacyDatabaseValue = async <K extends V1LegacyDatabaseKey>(key: K) => {
    const db = await getV1LegacyDatabase()
    const data = await db.get(V1_LEGACY_DB_NAME, `data-${key}`)

    return data as V1LegacyDatabaseDataMap[K] | undefined
}

export const removeV1LegacyDatabase = (): Promise<void> => deleteDB(V1_LEGACY_DB_NAME)

export const checkForV1LegacyDatabaseData = async (): Promise<boolean> => {
    const dbList = await indexedDB.databases()
    const dbExists = dbList.some((db) => db.name === V1_LEGACY_DB_NAME)
    if (!dbExists) {
        return false
    }

    const tracks = await getV1LegacyDatabaseValue('tracks')
    if (!tracks) {
        return false
    }

    if (Object.keys(tracks).length === 0) {
        try {
            void removeV1LegacyDatabase()
        } catch {
            // Ignore errors
        }

        return false
    }

    return true
}
