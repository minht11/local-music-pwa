import { snackbar } from '$lib/components/snackbar/snackbar'
import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import type { Directory } from '$lib/db/database-types'
import { getDB } from '$lib/db/get-db'
import type { TrackImportOptions } from '$lib/library/import-tracks/worker/types'
import { removeTrackInDb } from '$lib/library/tracks.svelte'
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

class DirectoriesStore {
	#inProgress = new SvelteSet<number>()

	isInprogress = (id: number): boolean => this.#inProgress.has(id)

	progress = (): boolean => this.#inProgress.size > 0

	markAsInprogress = (id: number): void => {
		this.#inProgress.add(id)
	}

	markAsDone = (id: number): void => {
		this.#inProgress.delete(id)
	}
}

export const directoriesStore: DirectoriesStore = new DirectoriesStore()

const importTracksFromDirectory = async (options: TrackImportOptions) => {
	const { importTracksFromDirectory: importDir } = await import(
		'$lib/library/import-tracks/import-tracks'
	)

	await importDir(options)
}

export const importDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<void> => {
	// TODO. Need try catch.
	const db = await getDB()
	const id = await db.add('directories', {
		handle: dirHandle,
	} as Directory)

	directoriesStore.markAsInprogress(id)

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

	directoriesStore.markAsDone(id)
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
		snackbar({
			id: 'dir-rescan-permission-denied',
			// TODO. i18n
			message: 'Permission denied.',
		})

		return
	}

	directoriesStore.markAsInprogress(dirId)

	await importTracksFromDirectory({
		action: 'directory-rescan',
		dirId,
		dirHandle,
	})

	directoriesStore.markAsDone(dirId)
}

export const importReplaceDirectory = async (
	dirIds: number[],
	newDirHandle: FileSystemDirectoryHandle,
): Promise<void> => {
	// We pick first id and make it the parents new id.
	const directoryId = dirIds[0]
	invariant(directoryId)
	// directoriesStore.markAsInprogress(directoryId)

	const db = await getDB()
	const tx = db.transaction(['directories', 'tracks'], 'readwrite')

	console.log('dirIds', dirIds)

	const promises = dirIds.map((existingDirId, index) => {
		if (index === 0) {
			const newDir: Directory = {
				id: directoryId,
				handle: newDirHandle,
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

	await Promise.all([...promises, tx.done])

	// notifyAboutDatabaseChanges([
	// 	{
	// 		key: directoryId,
	// 		storeName: 'directories',
	// 		operation: 'update',
	// 		value: newDir,
	// 	},
	// ])

	// await importTracksFromDirectory({
	// 	action: 'directory-rescan',
	// 	dirId: directoryId,
	// 	dirHandle: newDirHandle,
	// })

	// directoriesStore.markAsDone(directoryId)
}

export const removeDirectory = async (directoryId: number): Promise<void> => {
	const db = await getDB()

	directoriesStore.markAsInprogress(directoryId)
	const tx = db.transaction(
		['directories', 'tracks', 'albums', 'artists', 'playlistsTracks'],
		'readwrite',
	)

	const [directoryName, tracksToBeRemoved] = await Promise.all([
		tx
			.objectStore('directories')
			.get(directoryId)
			.then((dir) => dir?.handle.name),
		tx.objectStore('tracks').index('directory').getAllKeys(directoryId),
	])

	for (const trackId of tracksToBeRemoved) {
		await removeTrackInDb(trackId)
	}
	await db.delete('directories', directoryId)

	directoriesStore.markAsDone(directoryId)

	notifyAboutDatabaseChanges([
		{
			key: directoryId,
			storeName: 'directories',
			operation: 'delete',
		},
	])

	snackbar({
		id: `dir-removed-${directoryId}`,
		message: directoryName ? `Directory "${directoryName}" removed.` : 'Directory removed.',
	})
}
