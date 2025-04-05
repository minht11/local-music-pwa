import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { getDatabase } from '$lib/db/database.ts'
import { dispatchDatabaseChangedEvent, onDatabaseChange } from '$lib/db/events.ts'
import { lockDatabase } from '$lib/db/lock-database.ts'
import { getV1LegacyDatabaseValue, removeV1LegacyDatabase } from '$lib/db/v1-legacy/database.ts'
import type { FileEntity } from '$lib/helpers/file-system.ts'
import { dbCreatePlaylist } from '../playlists-actions.ts'
import { FAVORITE_PLAYLIST_ID } from '../types.ts'
import { scanTracks } from './scan-tracks.ts'

const prepareLegacyFiles = async () => {
	const tracks = await getV1LegacyDatabaseValue('tracks')
	if (!tracks) {
		return null
	}

	const fileIdMap = new Map<FileEntity, string>()
	for (const track of Object.values(tracks)) {
		if (track.fileWrapper.type === 'file') {
			fileIdMap.set(track.fileWrapper.file, track.id)
		} else {
			const handle = track.fileWrapper.file
			let permission = await handle.queryPermission()
			if (permission === 'prompt') {
				permission = await handle.requestPermission()
			}
			if (permission === 'granted') {
				fileIdMap.set(handle, track.id)
			}
		}
	}

	return fileIdMap
}

const addLegacyTrackToPlaylist = async (
	db: Awaited<ReturnType<typeof getDatabase>>,
	playlistId: number,
	legacyTrackIds: string[],
	tracksLegacyIdToNewIdMap: Map<string, number>,
) => {
	const tx = db.transaction('playlistsTracks', 'readwrite')

	const promises = legacyTrackIds.map(async (legacyTrackId) => {
		const trackId = tracksLegacyIdToNewIdMap.get(legacyTrackId)
		if (!trackId) {
			return undefined
		}

		const key = await tx.objectStore('playlistsTracks').add({
			playlistId,
			trackId,
		})

		return {
			operation: 'add',
			storeName: 'playlistsTracks',
			value: {
				playlistId,
				trackId,
			},
			key,
		} as const
	})

	const changes = await Promise.all(promises)

	dispatchDatabaseChangedEvent(changes)
}

const dbMigrateV1LegacyData = async () => {
	const legacyTracksFileIdMap = await prepareLegacyFiles()
	if (!legacyTracksFileIdMap) {
		return
	}

	// We listen when new track is added and then map it to legacy id
	// This could be faster if we passed the legacy id to the worker,
	// but we want to keep logic self contained as much as possible.
	const tracksLegacyIdToNewIdMap = new Map<string, number>()
	const cleanupDbListener = onDatabaseChange((changes) => {
		for (const change of changes) {
			console.log('change', change)
			if (change.storeName === 'tracks' && change.operation === 'add') {
				const legacyId = legacyTracksFileIdMap.get(change.value.file)
				if (legacyId) {
					tracksLegacyIdToNewIdMap.set(legacyId, change.key)
				}
			}
		}
	})

	await lockDatabase(() =>
		scanTracks({
			action: 'legacy-files-migrate-from-v1',
			files: [...legacyTracksFileIdMap.keys()],
		}),
	)

	cleanupDbListener()

	const legacyPlaylists = await getV1LegacyDatabaseValue('playlists')
	if (!legacyPlaylists) {
		return
	}

	console.log('legacyPlaylists', legacyPlaylists)

	const db = await getDatabase()
	for (const legacyPlaylist of Object.values(legacyPlaylists)) {
		try {
			const playlistId = await dbCreatePlaylist(legacyPlaylist.name, legacyPlaylist.dateCreated)

			await addLegacyTrackToPlaylist(
				db,
				playlistId,
				legacyPlaylist.trackIds,
				tracksLegacyIdToNewIdMap,
			)
		} catch (error) {
			console.error('Error while adding legacy playlist', error)
		}
	}
	try {
		const favorites = await getV1LegacyDatabaseValue('favorites')
		if (favorites) {
			await addLegacyTrackToPlaylist(db, FAVORITE_PLAYLIST_ID, favorites, tracksLegacyIdToNewIdMap)
		}
	} catch (error) {
		console.error('Error while adding legacy favorites', error)
	}
}

export const migrateV1LegacyData = async () => {
	try {
		await dbMigrateV1LegacyData()
		// await removeV1LegacyDatabase()
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}
