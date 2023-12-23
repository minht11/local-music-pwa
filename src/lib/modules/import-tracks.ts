// const diffFiles = (existingFiles: )

import { getDB } from '$lib/db/get-db'

const existingDirectories: FileSystemDirectoryHandle[] = []

let prevDirectory: FileSystemDirectoryHandle | undefined

export const importTracks = async () => {
	const directory = await showDirectoryPicker({
		startIn: 'music',
	})

	const equal = prevDirectory === directory

	console.log('equal', equal, prevDirectory, directory)

	prevDirectory = directory

	const db = await getDB()

	const existingDirectories = await db.getAll('directories')

	existingDirectories.forEach((directory) => {
		directory.handle.entries()
	})
}
