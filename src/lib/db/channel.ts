export interface DBChangeRecord<T> {
	storeName: string
	key?: number
	value?: T
	operation: 'add' | 'update' | 'delete' | 'clear-all'
}

export type DBChangeRecordList<T> = readonly DBChangeRecord<T>[]

export const channel = new BroadcastChannel('app-db-channel')

export const notifyDB = <T>(data: readonly (DBChangeRecord<T> | undefined)[]) => {
	channel.postMessage(data.filter(Boolean))
}
