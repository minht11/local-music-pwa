import type { AppStoreNames } from './get-db'

export interface DBChangeRecord {
	storeName: AppStoreNames
	id?: number
	value?: unknown
	operation: 'add' | 'update' | 'delete' | 'clear-all'
}

export type DBChangeRecordList = readonly DBChangeRecord[]

const channel = new EventTarget()

export const listenForDatabaseChanges = (handler: (changes: readonly DBChangeRecord[]) => void) => {
	if (import.meta.env.SSR) {
		return () => {}
	}

	const eventHandler = (event: CustomEventInit<DBChangeRecord[]>) => {
		const changes = event.detail

		if (!changes) {
			return
		}

		handler(changes)
	}

	channel.addEventListener('message', eventHandler)

	return () => channel.removeEventListener('message', eventHandler)
}

export const notifyAboutDatabaseChanges = (changes: DBChangeRecordList) => {
	const filteredChanges = changes.filter(Boolean)

	channel.dispatchEvent(new CustomEvent('message', { detail: filteredChanges }))
}
