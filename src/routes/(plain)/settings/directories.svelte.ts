import { snackbar } from '$lib/components/snackbar/snackbar'
import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import type { Directory } from '$lib/db/database-types'
import { getDB } from '$lib/db/get-db'
import type { TrackImportOptions } from '$lib/library/import-tracks/worker/types'
import { removeTrackWithTx } from '$lib/library/tracks.svelte'
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

	markAsInprogress = (id: number): void => {
		this.#inProgress.add(id)
	}

	narkAsDone = (id: number): void => {
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

export const importDirectory = async (newDirectory: FileSystemDirectoryHandle): Promise<void> => {
	const db = await getDB()
	const tx = db.transaction('directories', 'readwrite')

	const [id] = await Promise.all([
		tx.objectStore('directories').add({
			handle: newDirectory,
		} as Directory),
		tx.done,
	])

	directoriesStore.markAsInprogress(id)

	notifyAboutDatabaseChanges([
		{
			key: id,
			storeName: 'directories',
			operation: 'add',
			value: {
				handle: newDirectory,
				id,
			},
		},
	])

	await importTracksFromDirectory({
		action: 'directory-add',
		dirId: id,
		dirHandle: newDirectory,
	})

	directoriesStore.narkAsDone(id)
}

export const importReplaceDirectory = async (
	directoryId: number,
	newDirHandle: FileSystemDirectoryHandle,
): Promise<void> => {
	directoriesStore.markAsInprogress(directoryId)

	const db = await getDB()
	const tx = db.transaction('directories', 'readwrite')

	const newDir = {
		id: directoryId,
		handle: newDirHandle,
	} satisfies Directory

	await Promise.all([tx.objectStore('directories').put(newDir), tx.done])

	notifyAboutDatabaseChanges([
		{
			key: directoryId,
			storeName: 'directories',
			operation: 'update',
			value: newDir,
		},
	])

	await importTracksFromDirectory({
		action: 'directory-replace',
		dirId: directoryId,
		dirHandle: newDirHandle,
	})

	directoriesStore.narkAsDone(directoryId)
}

export const removeDirectory = async (directoryId: number): Promise<void> => {
	const db = await getDB()

	directoriesStore.markAsInprogress(directoryId)
	const tx = db.transaction(['directories', 'tracks', 'albums', 'artists'], 'readwrite')

	const [directoryName, tracksToBeRemoved] = await Promise.all([
		tx
			.objectStore('directories')
			.get(directoryId)
			.then((dir) => dir?.handle.name),
		tx.objectStore('tracks').index('directory').getAllKeys(directoryId),
	])

	for (const trackId of tracksToBeRemoved) {
		await removeTrackWithTx(tx, trackId)
	}

	await Promise.all([tx.objectStore('directories').delete(directoryId), tx.done])

	directoriesStore.narkAsDone(directoryId)

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
