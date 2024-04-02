import { snackbar } from '$lib/components/snackbar/snackbar'
import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import type { Directory } from '$lib/db/entities'
import { getDB } from '$lib/db/get-db'
import { removeTrackWithTx } from '$lib/library/tracks.svelte'
import { Set as SvelteSet } from 'svelte/reactivity'

export const checkNewDirectoryStatus = async (
	existingDir: FileSystemDirectoryHandle,
	newDir: FileSystemDirectoryHandle,
) => {
	const paths = await existingDir.resolve(newDir)

	let status: 'child' | 'existing' | 'parent' | undefined
	if (paths) {
		status = paths.length === 0 ? 'existing' : 'child'
	} else {
		const parent = await newDir.resolve(existingDir)

		if (parent) {
			status = 'parent'
		}
	}

	if (status) {
		return {
			status,
			existingDir,
			newDir,
		}
	}

	return undefined
}

class DirectoriesStore {
	#inProgress = new SvelteSet<number>()

	isInprogress = (id: number) => this.#inProgress.has(id)

	markAsInprogress = (id: number) => {
		this.#inProgress.add(id)
	}

	narkAsDone = (id: number) => {
		this.#inProgress.delete(id)
	}
}

export const directoriesStore = new DirectoriesStore()

export const importDirectory = async (newDirectory: FileSystemDirectoryHandle) => {
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
			id,
			storeName: 'directories',
			operation: 'add',
			value: {
				handle: newDirectory,
				id,
			},
		},
	])

	const { importTracksFromDirectory } = await import('$lib/library/import-tracks/import-tracks')

	await importTracksFromDirectory({
		handle: newDirectory,
		id,
	})

	directoriesStore.narkAsDone(id)
}

export const removeDirectory = async (directoryId: number) => {
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
			id: directoryId,
			storeName: 'directories',
			operation: 'delete',
		},
	])

	snackbar({
		id: `dir-removed-${directoryId}`,
		message: directoryName ? `Directory "${directoryName}" removed.` : 'Directory removed.',
	})
}
