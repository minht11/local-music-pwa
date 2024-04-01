import type { AppStoreNames } from './get-db'

export interface DBChangeRecord {
	storeName: AppStoreNames
	id?: number
	value?: unknown
	operation: 'add' | 'update' | 'delete' | 'clear-all'
}

export type DBChangeRecordList = readonly DBChangeRecord[]

// We need to notify our local frame and all other frames about database changes.
// Including web workers, other tabs, etc.
const crossChannel = new BroadcastChannel('db-changes')
const localChannel = new EventTarget()

export const listenForDatabaseChanges = (handler: (changes: readonly DBChangeRecord[]) => void) => {
	if (import.meta.env.SSR) {
		return () => {}
	}

	const abort = new AbortController()

	localChannel.addEventListener(
		'message',
		(e: CustomEventInit<DBChangeRecord[]>) => {
			const changes = e.detail

			if (!changes) {
				return
			}

			handler(changes)
		},
		{
			signal: abort.signal,
		},
	)

	crossChannel.addEventListener('message', (e: MessageEvent<DBChangeRecord[]>) => {
		handler(e.data)
	})

	return () => {
		abort.abort()
	}
}

export const notifyAboutDatabaseChanges = (changes: readonly (DBChangeRecord | undefined)[]) => {
	const filteredChanges = changes.filter(Boolean)

	if (filteredChanges.length === 0) {
		return
	}

	localChannel.dispatchEvent(new CustomEvent('message', { detail: filteredChanges }))
	crossChannel.postMessage(filteredChanges)
}
