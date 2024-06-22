// import { browser } from '$app/environment'
import type { AppStoreNames } from './get-db.ts'

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

type Listener = (changes: readonly DBChangeRecord[]) => void

// It is faster to manually store listeners in a Set, than registering 2 EventTargets.
const listeners = new Set<Listener>()

// TODO. https://github.com/sveltejs/kit/issues/12394
if (globalThis.window) {
	const notifyListeners = (changes: readonly DBChangeRecord[]) => {
		for (const listener of listeners) {
			listener(changes)
		}
	}

	localChannel.addEventListener('message', (e: CustomEventInit<DBChangeRecord[]>) => {
		const changes = e.detail

		if (!changes) {
			return
		}

		notifyListeners(changes)
	})

	crossChannel.addEventListener('message', (e: MessageEvent<DBChangeRecord[]>) => {
		notifyListeners(e.data)
	})
}

export const listenForDatabaseChanges = (handler: (changes: readonly DBChangeRecord[]) => void) => {
	if (import.meta.env.SSR) {
		return () => {}
	}

	listeners.add(handler)

	return () => {
		listeners.delete(handler)
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
