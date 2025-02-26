import { setContext } from 'svelte'

const channel = new BroadcastChannel('directories-changes')

interface DirectoryChangeMessage {
	inProgress: boolean
}

class DirectoriesStore {
	operationInAnotherTab: boolean = $state(false)

	operationInProgress: boolean = $state(false)

	constructor() {
		channel.addEventListener('message', (e: MessageEvent<DirectoryChangeMessage>) => {
			this.operationInProgress = e.data.inProgress
		})
	}
}

const mainContext = Symbol('directories-store')

export const provideDirectoriesStore = (): DirectoriesStore => {
	const main = new DirectoriesStore()

	setContext(mainContext, main)

	return main
}

export const useMainStore = (): DirectoriesStore => {
	const main = getContext<MainStore>(mainContext)

	invariant(main, 'No main store found')

	return main
}
