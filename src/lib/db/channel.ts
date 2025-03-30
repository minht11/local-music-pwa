import type { AppDB, AppStoreNames } from './database.ts'

type ChangeRecordBaseNonFiltered<StoreName extends AppStoreNames> =
	| {
			storeName: StoreName
			operation: 'add'
			key: AppDB[StoreName]['key']
			value: AppDB[StoreName]['value']
	  }
	| {
			storeName: StoreName
			operation: 'update'
			key: AppDB[StoreName]['key']
			value: AppDB[StoreName]['value']
	  }
	| {
			storeName: StoreName
			key: AppDB[StoreName]['key']
			operation: 'delete'
	  }

// For some schemas we want to enforce that only certain operations are allowed.
type ChangeRecordBase<StoreName extends AppStoreNames> = Exclude<
	ChangeRecordBaseNonFiltered<StoreName>,
	{ operation: AppDB[StoreName]['meta']['notAllowedOperations'] }
>

// Needed for typescript narrowing to work properly
type DbChangeRecordsMap = {
	[StoreName in AppStoreNames]: ChangeRecordBase<StoreName>
}

export type DatabaseChangeRecord = DbChangeRecordsMap[AppStoreNames]

export type DatabaseChangeRecordList = readonly DatabaseChangeRecord[]

// We need to notify our local frame and all other frames about database changes.
// Including web workers, other tabs, etc.
const crossChannel = new BroadcastChannel('db-changes')
const localChannel = new EventTarget()

type Listener = (changes: readonly DatabaseChangeRecord[]) => void

// It is faster to manually store listeners in a Set, than registering 2 EventTargets.
const listeners = new Set<Listener>()

// TODO. https://github.com/sveltejs/kit/issues/12394
// We only want listeners to be registered in the main thread.
if (globalThis.window) {
	const notifyListeners = (changes: readonly DatabaseChangeRecord[]) => {
		for (const listener of listeners) {
			listener(changes)
		}
	}

	localChannel.addEventListener('message', (e: CustomEventInit<DatabaseChangeRecord[]>) => {
		const changes = e.detail

		if (!changes) {
			return
		}

		notifyListeners(changes)
	})

	crossChannel.addEventListener('message', (e: MessageEvent<DatabaseChangeRecord[]>) => {
		notifyListeners(e.data)
	})
}

export const listenForDatabaseChanges = (
	handler: (changes: readonly DatabaseChangeRecord[]) => void,
): (() => void) => {
	if (import.meta.env.SSR) {
		return () => {}
	}

	listeners.add(handler)

	return () => {
		listeners.delete(handler)
	}
}

export const notifyAboutDatabaseChanges = (
	changes: readonly (DatabaseChangeRecord | undefined)[],
): void => {
	const filteredChanges = changes.filter((c) => c !== undefined)
	if (filteredChanges.length === 0) {
		return
	}

	localChannel.dispatchEvent(new CustomEvent('message', { detail: filteredChanges }))
	crossChannel.postMessage(filteredChanges)
}
