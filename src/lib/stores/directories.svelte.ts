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
