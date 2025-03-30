import { snackbar } from '$lib/components/snackbar/snackbar'
import { type DatabaseChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { getDatabase } from '$lib/db/database'
import type { Directory } from '$lib/db/database-types'
import { removeTrack } from '$lib/library/tracks.svelte'
import { lockDatabase } from './lock-database.ts'
import { scanTracks } from './scan-tracks.ts'

export interface DirectoryStatus {
	status: 'child' | 'existing' | 'parent'
	existingDir: Directory
	newDirHandle: FileSystemDirectoryHandle
}

export const checkNewDirectoryStatus = async (
	existingDir: Directory,
	newDirHandle: FileSystemDirectoryHandle,
): Promise<DirectoryStatus | undefined> => {
	const paths = await existingDir.handle.resolve(newDirHandle)

	let status: 'child' | 'existing' | 'parent' | undefined
	if (paths) {
		status = paths.length === 0 ? 'existing' : 'child'
	} else {
		const parent = await newDirHandle.resolve(existingDir.handle)

		if (parent) {
			status = 'parent'
		}
	}

	if (status) {
		return {
			status,
			existingDir,
			newDirHandle,
		}
	}

	return undefined
}

const dbImportNewDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<void> => {
	const db = await getDatabase()
	const id = await db.add('directories', {
		handle: dirHandle,
	} as Directory)

	notifyAboutDatabaseChanges([
		{
			key: id,
			storeName: 'directories',
			operation: 'add',
			value: {
				handle: dirHandle,
				id,
			},
		},
	])

	await scanTracks({
		action: 'directory-add',
		dirId: id,
		dirHandle: dirHandle,
	})
}

export const importNewDirectory = async (handle: FileSystemDirectoryHandle): Promise<void> => {
	try {
		await lockDatabase(() => dbImportNewDirectory(handle))
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

export const rescanDirectory = async (
	dirId: number,
	dirHandle: FileSystemDirectoryHandle,
): Promise<void> => {
	let permission = await dirHandle.queryPermission()
	if (permission === 'prompt') {
		permission = await dirHandle.requestPermission()
	}

	if (permission !== 'granted') {
		snackbar(m.settingsGrantDirectoryAccess())

		return
	}

	try {
		await lockDatabase(() =>
			scanTracks({
				action: 'directory-rescan',
				dirId,
				dirHandle,
			}),
		)
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

const dbReplaceDirectories = async (
	parentDirHandle: FileSystemDirectoryHandle,
	directoriesIds: readonly number[],
): Promise<void> => {
	const dirIds = [...directoriesIds]
	const directoryId = dirIds.pop()
	// We pick last id and make it the parents new id.
	invariant(directoryId)

	const db = await getDatabase()
	const tx = db.transaction(['directories', 'tracks'], 'readwrite')

	const newDir: Directory = {
		id: directoryId,
		handle: parentDirHandle,
	}

	const replaceHandlePromise = tx.objectStore('directories').put(newDir).then((): DatabaseChangeRecord => ({
		key: directoryId,
		storeName: 'directories',
		operation: 'add',
		value: newDir,
	}))
	
	const promises = dirIds.map(
		async (existingDirId): Promise<DatabaseChangeRecord[]> => {
			// Update all tracks to point to the new directory.
			const updatedTracksPromise = tx
				.objectStore('tracks')
				.index('directory')
				.openCursor(existingDirId)
				.then(async (c) => {
					let cursor = c

					const trackChangeRecords: DatabaseChangeRecord[] = []
					while (cursor) {
						const track = cursor.value
						track.directory = directoryId
						await cursor.update(track)
						cursor = await cursor.continue()

						trackChangeRecords.push({
							key: track.id,
							storeName: 'tracks',
							operation: 'update',
							value: track,
						})
					}

					return trackChangeRecords
				})

			const removedDirectoryPromise = tx
				.objectStore('directories')
				.delete(existingDirId)
				.then(
					(): DatabaseChangeRecord => ({
						key: existingDirId,
						storeName: 'directories',
						operation: 'delete',
					}),
				)

			const result = await Promise.all([removedDirectoryPromise, updatedTracksPromise])
			return result.flat()
		},
	)

	const [_, ...changes] = await Promise.all([tx.done, replaceHandlePromise, ...promises])
	console.log('REPLACE_DIRS', changes, changes.flat())

	notifyAboutDatabaseChanges(changes.flat())

	await scanTracks({
		action: 'directory-rescan',
		dirId: directoryId,
		dirHandle: parentDirHandle,
	})
}

export const replaceDirectories = async (
	parentDirHandle: FileSystemDirectoryHandle,
	dirsIds: number[],
): Promise<void> => {
	try {
		await lockDatabase(() => dbReplaceDirectories(parentDirHandle, dirsIds))
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

const dbRemoveDirectory = async (directoryId: number): Promise<void> => {
	const db = await getDatabase()

	const tx = db.transaction(['directories', 'tracks'])
	const [tracksToBeRemoved] = await Promise.all([
		tx.objectStore('tracks').index('directory').getAllKeys(directoryId),
	])

	for (const trackId of tracksToBeRemoved) {
		await removeTrack(trackId)
	}
	await db.delete('directories', directoryId)

	notifyAboutDatabaseChanges([
		{
			key: directoryId,
			storeName: 'directories',
			operation: 'delete',
		},
	])
}

export const removeDirectory = async (id: number): Promise<void> => {
	try {
		await lockDatabase(() => dbRemoveDirectory(id))

		snackbar(m.settingsDirectoryRemoved())
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}
