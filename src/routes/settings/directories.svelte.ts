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
	#inProgress = $state<Record<number, boolean>>({})

	markAsInprogress = (id: number) => {
		this.#inProgress[id] = true
	}

	isInprogress = (id: number) => {
		return this.#inProgress[id] ?? false
	}

	remove = (id: number) => {
		delete this.#inProgress[id]
	}
}

export const directoriesStore = new DirectoriesStore()
