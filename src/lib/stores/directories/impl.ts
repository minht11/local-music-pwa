import {
	type TrackImportOptions,
	importTracksFromDirectory,
} from '$lib/library/import-tracks/import-tracks'

const channel = new BroadcastChannel('directories-changes')

interface DirectoryChangeMessage {
	type: 'progress'
	inProgress: boolean
}

export class DirectoriesStore {
	operationInAnotherTab: boolean = $state(false)

	#thisTabInProgress = $state(false)

	set operationInProgress(value: boolean) {
		this.#thisTabInProgress = value

		const event: DirectoryChangeMessage = {
			type: 'progress',
			inProgress: value,
		}
		channel.postMessage(event)
	}

	constructor() {
		channel.addEventListener('message', (e: MessageEvent<DirectoryChangeMessage>) => {
			const { data } = e

			if (data.type === 'progress') {
				this.operationInAnotherTab = data.inProgress
			}
		})
	}

	async importTracksFromDirectory(options: TrackImportOptions): Promise<void> {
		this.operationInProgress = true
		await importTracksFromDirectory(options)
		this.operationInProgress = false
	}
}
