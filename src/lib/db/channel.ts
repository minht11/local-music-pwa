export interface DBChangeRecord {
	storeName: string
	id?: number
	value?: unknown
	operation: 'add' | 'update' | 'delete' | 'clear-all'
}

export type DBChangeRecordList = readonly DBChangeRecord[]

export const channel = new BroadcastChannel('app-db-channel')

export const notifyDB = (changes: DBChangeRecordList) => {
	channel.postMessage(changes.filter(Boolean))
}
