import { snackbar } from '$lib/components/snackbar/snackbar'
import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import type { Directory } from '$lib/db/database-types'
import { getDB } from '$lib/db/get-db'
import type { TrackImportOptions } from '$lib/library/import-tracks/worker/types'
import { removeTrack } from '$lib/library/tracks.svelte'
import { SvelteSet } from 'svelte/reactivity'

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

let counter = 0
let pendingTasks = new SvelteSet<number>()
export const isDatabaseOperationInProgress = (): boolean => pendingTasks.size > 0

const lockDatabase = async <T = void>(action: () => Promise<T>): Promise<T> => {
	const id = counter
	counter += 1
	pendingTasks.add(id)

	try {
		return await navigator.locks.request('database', () => action())
	} finally {
		pendingTasks.delete(id)
	}
}

const importTracksFromDirectory = async (options: TrackImportOptions) => {
	const { importTracksFromDirectory: importDir } = await import(
		'$lib/library/import-tracks/import-tracks'
	)

	await importDir(options)
}

const importNewDirectoryImpl = async (dirHandle: FileSystemDirectoryHandle): Promise<void> => {
	const db = await getDB()
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

	await importTracksFromDirectory({
		action: 'directory-add',
		dirId: id,
		dirHandle: dirHandle,
	})
}

/**
 * This function will never throw an error, instead it will show a snackbar.
 */
export const importNewDirectory = async (handle: FileSystemDirectoryHandle): Promise<void> => {
	try {
		await lockDatabase(() => importNewDirectoryImpl(handle))

		snackbar('Directory imported.')
	} catch (error) {
		console.error(error)

		snackbar('Failed to import directory')
	}
}

const rescanDirectoryImpl = async (
	dirId: number,
	dirHandle: FileSystemDirectoryHandle,
): Promise<void> => {
	await importTracksFromDirectory({
		action: 'directory-rescan',
		dirId,
		dirHandle,
	})
}

/**
 * This function will never throw an error, instead it will show a snackbar.
 */
export const rescanDirectory = async (
	dirId: number,
	dirHandle: FileSystemDirectoryHandle,
): Promise<void> => {
	let permission = await dirHandle.queryPermission()
	if (permission === 'prompt') {
		permission = await dirHandle.requestPermission()
	}

	if (permission !== 'granted') {
		snackbar('You need to grant permission to the directory in order to rescan it.')

		return
	}

	try {
		await lockDatabase(() => rescanDirectoryImpl(dirId, dirHandle))
	} catch (error) {
		console.error(error)

		snackbar('Failed to rescan directory')
	}
}

const replaceDirectoriesImpl = async (
	parentDirHandle: FileSystemDirectoryHandle,
	dirIds: number[],
): Promise<void> => {
	// We pick first id and make it the parents new id.
	const directoryId = dirIds[0]
	invariant(directoryId)

	const db = await getDB()
	const tx = db.transaction(['directories', 'tracks'], 'readwrite')

	const promises = dirIds.map((existingDirId, index) => {
		if (index === 0) {
			const newDir: Directory = {
				id: directoryId,
				handle: parentDirHandle,
			}
			return tx.objectStore('directories').put(newDir)
		}
		// Update all tracks to point to the new directory.
		const p = tx
			.objectStore('tracks')
			.index('directory')
			.openCursor(existingDirId)
			.then(async (c) => {
				let cursor = c

				while (cursor) {
					const track = cursor.value
					track.directory = directoryId
					await cursor.update(track)
					cursor = await cursor.continue()
				}
			})

		return Promise.all([p, tx.objectStore('directories').delete(existingDirId)])
	})

	const [newDir] = await Promise.all([...promises, tx.done])

	notifyAboutDatabaseChanges([
		{
			key: directoryId,
			storeName: 'directories',
			operation: 'update',
			value: newDir,
		},
	])

	await importTracksFromDirectory({
		action: 'directory-rescan',
		dirId: directoryId,
		dirHandle: parentDirHandle,
	})
}

/**
 * This function will never throw an error, instead it will show a snackbar.
 */
export const replaceDirectories = async (
	parentDirHandle: FileSystemDirectoryHandle,
	dirsIds: number[],
): Promise<void> => {
	try {
		await lockDatabase(() => replaceDirectoriesImpl(parentDirHandle, dirsIds))

		snackbar('Directory imported.')
	} catch (error) {
		console.error(error)

		snackbar('Failed to import directory')
	}
}

const removeDirectoryImpl = async (directoryId: number): Promise<string | undefined> => {
	const db = await getDB()

	const tx = db.transaction(['directories', 'tracks'])
	const [directoryName, tracksToBeRemoved] = await Promise.all([
		tx
			.objectStore('directories')
			.get(directoryId)
			.then((dir) => dir?.handle.name),
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

	return directoryName
}

/**
 * This function will never throw an error, instead it will show a snackbar.
 */
export const removeDirectory = async (id: number): Promise<void> => {
	try {
		const dirName = await lockDatabase(() => removeDirectoryImpl(id))

		snackbar(dirName ? `Directory "${dirName}" removed.` : 'Directory removed.')
	} catch {
		console.error('Failed to remove directory')
		snackbar('Failed to remove directory')
	}
}
