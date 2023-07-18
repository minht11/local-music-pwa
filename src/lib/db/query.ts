import type { IndexNames, StoreNames } from 'idb'
import { readable, derived, type Readable, type Writable, writable } from 'svelte/store'
import { type DBChangeRecordList, channel } from './channel'
import { getAllKeys, getValue, type AppDB, isStoreEmpty } from './get-db'

// TODO. Add support for cleaning up the cache.
const cache = new Map<string, unknown>()
channel.addEventListener('message', (e: MessageEvent<DBChangeRecordList<unknown>>) => {
	e.data.forEach((change) => {
		const { operation, key } = change
		if (operation === 'clear-all') {
			cache.clear()
			return
		}

		// TODO.
		const cacheKey = `${change.storeName}-${key === undefined ? 'idk' : key}`

		if (!cache.has(cacheKey)) {
			return
		}

		if (operation === 'delete') {
			cache.delete(cacheKey)
			return
		}

		if (operation === 'update') {
			cache.set(cacheKey, change.value)
		}
	})
})

export const preloadValues = async <StoreName extends StoreNames<AppDB>>(
	storeName: StoreName,
	keys: number[],
	size: number,
) => {
	const getCacheKey = (key: number) => `${storeName}-${key}`
	const keysNotInCache = [...keys].splice(0, size).filter((key) => !cache.has(getCacheKey(key)))

	console.log('Preload', keysNotInCache)
	const promises = keysNotInCache.map(async (key) => {
		const value = await getValue(storeName, key)

		cache.set(getCacheKey(key), value)
	})

	await Promise.all(promises)
	console.log('Preload done')
}

export interface QueryActions<R> {
	mutate(value: R): void
	refetch(): void
}

export type QueryFetcher<R, S> = (source: S) => Promise<R> | R

type QueryOptionsWithoutSource<R> = {
	fetcher: () => Promise<R> | R
}

type QueryOptionsWithSource<R, S> = {
	source: S
	fetcher: (source: S) => Promise<R> | R
}

type BaseQueryOptions<R> = {
	onDatabaseChange(e: DBChangeRecordList<R>, actions: QueryActions<R>): void
	initialValue?: R
}

export type QueryOptions<R, S> = (QueryOptionsWithoutSource<R> | QueryOptionsWithSource<R, S>) &
	BaseQueryOptions<R>

export const query = <R, S>(options: QueryOptions<R, S>) =>
	readable(options.initialValue, (set) => {
		const controller = new AbortController()

		const refetch = async () => {
			let result: R

			if ('source' in options) {
				result = await options.fetcher(options.source)
			} else {
				result = await options.fetcher()
			}

			set(result)
		}

		channel.addEventListener(
			'message',
			(e: MessageEvent<DBChangeRecordList<R>>) => {
				options.onDatabaseChange(e.data, { mutate: set, refetch })
			},
			{
				signal: controller.signal,
			},
		)

		return () => {
			controller.abort()
		}
	})

export const nah = query({
	source: 1,
	fetcher: () => Promise.resolve(1),
})

type AppStoreNames = StoreNames<AppDB>

export interface QueryKeysOptions<StoreName extends AppStoreNames> {
	storeName: StoreName
	sortBy?: SortBy<StoreName>
	preload?: number
}

export const queryKeys = <StoreName extends AppStoreNames>(
	options: QueryKeysOptions<StoreName>,
) => {
	const { storeName, sortBy = SORT_BY_NAME, preload = 0 } = options

	return query({
		fetcher: () => getAllKeys(storeName, sortBy()),
		onDatabaseChange(changes, { mutate, refetch }) {
			changes.forEach((change) => {
				if (change.operation === 'clear-all') {
					mutate([])
					return
				}

				if (change.storeName !== storeName) {
					return
				}

				const { operation, key } = change

				if (operation === 'delete') {
					mutate((keys) => keys.filter((k) => k !== key))
					return
				}

				// If item value changed or new value was added,
				// sort order might have changed so we need to refetch
				// the whole list.
				refetch()
			})
		},
		initialValue: [],
	})
}

const SORT_BY_NAME = (): 'name' => 'name'
type SortBy<StoreName extends StoreNames<AppDB>> = () => IndexNames<AppDB, StoreName>

// interface KeysQueryOptions<StoreName extends StoreNames<AppDB>> {
//   storeName: StoreName
//   sortBy: SortBy<StoreName>
//   useSuspense?: boolean
// }

interface DBKeysQueryOptions<StoreName extends StoreNames<AppDB>> {
	storeName: StoreName
	sortBy?: SortBy<StoreName>
	preload?: number
	disableSuspense?: boolean
}

export const createKeysQuery = <StoreName extends StoreNames<AppDB>>(
	options: DBKeysQueryOptions<StoreName>,
) => {
	const { storeName, sortBy = SORT_BY_NAME, preload = 0 } = options

	return createQuery(
		() => true,
		async () => {
			const keys = await getAllKeys(storeName, sortBy())

			if (preload) {
				await preloadValues(storeName, keys, Math.max(0, preload))
			}

			return keys
		},
		{
			onChange: (changes, { mutate, refetch }) => {
				changes.forEach((change) => {
					if (change.operation === 'clear-all') {
						mutate([])
						return
					}

					if (change.storeName !== storeName) {
						return
					}

					const { operation, key } = change

					if (operation === 'delete') {
						mutate((keys) => keys.filter((k) => k !== key))
						return
					}

					// If item value changed or new value was added,
					// sort order might have changed so we need to refetch
					// the whole list.
					refetch()
				})
			},
			initialValue: [],
			disableSuspense: options.disableSuspense,
		},
	)
}

export const createValueQuery = <StoreName extends StoreNames<AppDB>>(
	storeName: StoreName,
	getID: () => number | undefined,
	disableSuspense?: boolean,
) => {
	const initialID = getID()

	type Value = Awaited<ReturnType<typeof getValue<StoreName>>>
	const initialValue =
		initialID !== undefined ? (cache.get(`${storeName}-${initialID}`) as Value) : undefined

	return query(
		() => getID(),
		(id) => {
			if (id === undefined) {
				return undefined
			}

			const cacheKey = `${storeName}-${id}`
			const cachedValue = cache.get(cacheKey)

			if (cachedValue !== undefined) {
				return cachedValue
			}

			return getValue(storeName, id).then((value) => {
				if (value !== undefined) {
					cache.set(cacheKey, value)
				}

				return value
			})
		},
		{
			onChange: (changes, { mutate }) => {
				const id = getID()

				if (id === undefined) {
					return
				}

				const cacheKey = `${storeName}-${id}`
				changes.forEach((change) => {
					if (change.storeName === storeName && change.key === id) {
						if (change.operation === 'delete') {
							mutate(undefined)
							cache.delete(cacheKey)
							return
						}

						cache.set(cacheKey, change.value)
						mutate(change.value)
					}
				})
			},
			initialValue,
			disableSuspense,
		},
	)
}
