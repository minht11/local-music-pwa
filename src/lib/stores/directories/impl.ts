const channel = new BroadcastChannel('directories-changes')

interface DirectoryChangeMessage {
	inProgress: boolean
}

export class DirectoriesStore {
	operationInAnotherTab: boolean = $state(false)

	operationInProgress: boolean = $state(false)

	constructor() {
		channel.addEventListener('message', (e: MessageEvent<DirectoryChangeMessage>) => {
			this.operationInProgress = e.data.inProgress
		})
	}
}
