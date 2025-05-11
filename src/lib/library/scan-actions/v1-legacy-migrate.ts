import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { getDatabase } from '$lib/db/database.ts'
import { lockDatabase } from '$lib/db/lock-database.ts'
import { getV1LegacyDatabaseValue, removeV1LegacyDatabase } from '$lib/db/v1-legacy/database.ts'
import type { FileEntity } from '$lib/helpers/file-system.ts'
import { dbAddMultipleTracksToPlaylist, dbCreatePlaylist } from '../playlists-actions.ts'
import { FAVORITE_PLAYLIST_ID, LEGACY_NO_NATIVE_DIRECTORY } from '../types.ts'
import { scanTracks } from './scan-tracks.ts'

const prepareLegacyFiles = async () => {
	const tracks = await getV1LegacyDatabaseValue('tracks')
	if (!tracks) {
		return null
	}

	const legacyIdToUuidMap = new Map<string, string>()
	const files: { uuid: string; file: FileEntity }[] = []
	for (const track of Object.values(tracks)) {
		const { file, type } = track.fileWrapper
		if (type === 'fileRef') {
			let permission = await file.queryPermission()
			if (permission === 'prompt') {
				permission = await file.requestPermission()
			}
			if (permission !== 'granted') {
				continue
			}
		}

		const uuid = crypto.randomUUID()
		files.push({
			uuid,
			file,
		})
		legacyIdToUuidMap.set(track.id, uuid)
	}

	return {
		legacyIdToUuidMap,
		files,
	}
}

const dbMigrateV1LegacyData = async () => {
	const legacy = await prepareLegacyFiles()
	if (!legacy) {
		return
	}

	await lockDatabase(() =>
		scanTracks({
			action: 'legacy-files-migrate-from-v1',
			files: legacy.files,
		}),
	)

	const legacyPlaylists = await getV1LegacyDatabaseValue('playlists')
	if (!legacyPlaylists) {
		return
	}

	const db = await getDatabase()
	const tracks = await db.getAllFromIndex('tracks', 'directory', LEGACY_NO_NATIVE_DIRECTORY)

	const mapTrackLegacyIdsToNewIds = (legacyIds: string[]) => legacyIds.map((legacyTrackId) => {
		const uuid = legacy.legacyIdToUuidMap.get(legacyTrackId)
		const newId = tracks.find((track) => track.uuid === uuid)?.id

		return newId
	}).filter((id) => id !== undefined) 


	for (const legacyPlaylist of Object.values(legacyPlaylists)) {
		try {
			const playlistId = await dbCreatePlaylist(legacyPlaylist.name, legacyPlaylist.dateCreated)

			await dbAddMultipleTracksToPlaylist(
				playlistId,
				mapTrackLegacyIdsToNewIds(legacyPlaylist.trackIds),
			)
		} catch (error) {
			console.error('Error while adding legacy playlist', error)
		}
	}

	try {
		const favorites = await getV1LegacyDatabaseValue('favorites')
		if (favorites) {
			await dbAddMultipleTracksToPlaylist(
				FAVORITE_PLAYLIST_ID,
				mapTrackLegacyIdsToNewIds(favorites),
			)
		}
	} catch (error) {
		console.error('Error while adding legacy favorites', error)
	}
}

export const migrateV1LegacyData = async () => {
	try {
		await dbMigrateV1LegacyData()
		await removeV1LegacyDatabase()
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}
