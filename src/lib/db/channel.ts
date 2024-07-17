import type { AppDB, AppStoreNames } from './get-db.ts'

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

export type DBChangeRecord = DbChangeRecordsMap[AppStoreNames]

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

	listeners.add(handler as Listener)

	return () => {
		listeners.delete(handler as Listener)
	}
}

export const notifyAboutDatabaseChanges = (changes: readonly (DBChangeRecord | undefined)[]) => {
	const filteredChanges = changes.filter((c) => c !== undefined)

	if (filteredChanges.length === 0) {
		return
	}

	localChannel.dispatchEvent(new CustomEvent('message', { detail: filteredChanges }))
	crossChannel.postMessage(filteredChanges)
}
