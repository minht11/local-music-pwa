import type { AppDB, AppStoreNames } from './database.ts'

type DatabaseOperationsConfig<StoreName extends AppStoreNames> =
	| (
			| {
					storeName: Exclude<StoreName, 'playlistEntries'>
					operation: 'add'
					key: AppDB[StoreName]['key']
			  }
			| {
					storeName: Exclude<StoreName, 'playlistEntries'>
					operation: 'update'
					key: AppDB[StoreName]['key']
			  }
			| {
					storeName: Exclude<StoreName, 'playlistEntries'>
					operation: 'delete'
					key: AppDB[StoreName]['key']
			  }
	  )
	| (
			| {
					storeName: Extract<StoreName, 'playlistEntries'>
					operation: 'add'
					key: AppDB[StoreName]['key']
					value: AppDB[StoreName]['value']
			  }
			| {
					storeName: Extract<StoreName, 'playlistEntries'>
					operation: 'update'
					key: AppDB[StoreName]['key']
					value: AppDB[StoreName]['value']
			  }
			| {
					storeName: Extract<StoreName, 'playlistEntries'>
					operation: 'delete'
					key: AppDB[StoreName]['key']
					value: AppDB[StoreName]['value']
			  }
	  )

// For some schemas we want to enforce that only certain operations are allowed.
type DatabaseChangeDetailsNonNarrowed<StoreName extends AppStoreNames> = Exclude<
	DatabaseOperationsConfig<StoreName>,
	{ operation: AppDB[StoreName]['meta']['notAllowedOperations'] }
>

export type DatabaseChangeDetails = {
	// Needed for typescript narrowing to work properly
	[StoreName in AppStoreNames]: DatabaseChangeDetailsNonNarrowed<StoreName>
}[AppStoreNames]

export type DatabaseChangeDetailsList = readonly DatabaseChangeDetails[]

// We need to notify our local frame and all other frames about database changes.
// Including web workers, other tabs, etc.
const crossChannel = new BroadcastChannel('db-changes')
const localChannel = new EventTarget()

type Listener = (changes: readonly DatabaseChangeDetails[]) => void

// It is faster to manually store listeners in a Set, than registering 2 EventTargets.
const listeners = new Set<Listener>()

// We only want listeners to be registered in the main thread.
if (globalThis.window) {
	const notifyListeners = (changes: readonly DatabaseChangeDetails[]) => {
		for (const listener of listeners) {
			listener(changes)
		}
	}

	localChannel.addEventListener('message', (e: CustomEventInit<DatabaseChangeDetails[]>) => {
		const changes = e.detail

		if (!changes) {
			return
		}

		notifyListeners(changes)
	})

	crossChannel.addEventListener('message', (e: MessageEvent<DatabaseChangeDetails[]>) => {
		notifyListeners(e.data)
	})
}

export const onDatabaseChange = (
	handler: (changes: readonly DatabaseChangeDetails[]) => void,
): (() => void) => {
	if (import.meta.env.SSR) {
		return () => {}
	}

	listeners.add(handler)

	return () => {
		listeners.delete(handler)
	}
}

export const dispatchDatabaseChangedEvent = (
	changes: readonly (DatabaseChangeDetails | undefined)[] | DatabaseChangeDetails,
): void => {
	const changesArray = Array.isArray(changes) ? changes : [changes]

	const filteredChanges = changesArray.filter((c) => c !== undefined)
	if (filteredChanges.length === 0) {
		return
	}

	localChannel.dispatchEvent(new CustomEvent('message', { detail: filteredChanges }))
	crossChannel.postMessage(filteredChanges)
}
