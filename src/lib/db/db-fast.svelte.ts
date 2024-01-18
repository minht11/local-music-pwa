import { assign } from '$lib/helpers/utils'
import { untrack } from 'svelte'
import { WeakLRUCache } from 'weak-lru-cache'
import { type DBChangeRecordList, listenForDatabaseChanges } from './channel'
import type { AppStoreNames } from './get-db'

// Fast in memory cache so we do not need to
// call indexed db for every access
const cache = new WeakLRUCache<string, unknown>({
	cacheSize: 10_000,
})

export type QueryKey = readonly unknown[]

const normalizeKey = <const K extends QueryKey>(key: K) => JSON.stringify(key)

export const getCacheValue = <const K extends QueryKey, R>(key: K) =>
	cache.getValue(normalizeKey(key)) as R | undefined

export const deleteCacheValue = <const K extends QueryKey>(key: K) =>
	cache.delete(normalizeKey(key))

if (!import.meta.env.SSR) {
	window.acache = cache
}

export type QueryStatus = 'loading' | 'loaded' | 'error'

type QueryBaseState = {
	status: QueryStatus
	key?: string
}

type QueryLoadedState<R> = {
	status: 'loaded'
	loading: false
	value: R
	error?: undefined
}

type QueryLoadingState<R> = {
	status: 'loading'
	loading: true
	value?: R
	error?: undefined
}

type QueryErrorState<R> = {
	status: 'error'
	loading: false
	value: R
	error: unknown
}

export type QueryState<R> = QueryBaseState &
	(QueryLoadedState<R> | QueryLoadingState<R> | QueryErrorState<R>)

export type QueryMutate<R> = (value: R | ((prev: R) => void)) => void

export interface QueryOptions<K extends QueryKey, R> {
	key: K | (() => K)
	disableCache?: boolean
	fetcher: (key: K) => Promise<R> | R
	onDatabaseChange?: (
		changes: DBChangeRecordList,
		actions: { mutate: QueryMutate<R | undefined>; refetch: () => void },
	) => void
	initialValue?: R
}

export const createQuery = <const K extends QueryKey, R>(options: QueryOptions<K, R>) => {
	type InternalState = Omit<QueryState<R>, 'loading'>

	const getKey = () => (typeof options.key === 'function' ? options.key() : options.key)

	const getLoadedState = (value: R): InternalState => ({
		status: 'loaded',
		value,
		error: undefined,
		key: normalizeKey(getKey()),
	})

	const getInitialValue = (key: K): InternalState => {
		if (options.disableCache) {
			return getLoadedState(undefined as R)
		}

		const value = getCacheValue(key) ?? options.initialValue

		if (value) {
			return getLoadedState(value as R)
		}

		return {
			status: 'loading',
			error: undefined,
			value: undefined,
			key: undefined,
		}
	}

	const state = $state<InternalState>(getInitialValue(getKey()))

	const load = async (forceFresh?: boolean) => {
		const key = getKey()
		const normalizedKey = normalizeKey(key)

		const useCache = !(options.disableCache || forceFresh)

		if (useCache) {
			// Attempt to load data from cache
			const value = cache.getValue(normalizedKey)
			if (value) {
				assign(state, getLoadedState(value as R))

				return
			}
		}

		assign(state, {
			status: 'loading',
			error: undefined,
		})

		try {
			const value = await options.fetcher(key)
			if (!options.disableCache) {
				cache.setValue(normalizedKey, value)
			}

			assign(state, getLoadedState(value))
		} catch (e) {
			assign(state, {
				status: 'error',
				value: undefined,
				error: e,
				key: normalizedKey,
			})
		}
	}

	$effect(() => {
		if (state.key !== normalizeKey(getKey())) {
			void untrack(load)
		}
	})

	const stopListening = listenForDatabaseChanges((changes) => {
		options.onDatabaseChange?.(changes, {
			mutate: (v) => {
				let value: R | undefined
				if (typeof v === 'function') {
					// @ts-expect-error TODO
					value = v(state.value)
				}

				if (!options.disableCache) {
					cache.setValue(normalizeKey(getKey()), value)
				}

				assign(state, getLoadedState(value as R))
			},
			refetch: () => load(true),
		})
	})

	$effect(() => () => {
		return () => {
			console.log('stop listening')
			stopListening()
		}
	})

	return {
		get status() {
			return state.status
		},
		get value() {
			return state.value
		},
		get loading() {
			return state.status === 'loading'
		},
		get error() {
			return state.error
		},
	} as QueryState<R>
}

export const defineQuery = <const K extends QueryKey, R>(options: QueryOptions<K, R>) => {
	const preload = async () => {
		const key = typeof options.key === 'function' ? options.key() : options.key
		const value = await options.fetcher(key)

		if (!options.disableCache) {
			cache.setValue(normalizeKey(key), value)
		}

		return value
	}

	const create = () => createQuery(options)

	return {
		preload,
		create,
		createPreloaded: async () => {
			const value = await preload()

			// @ts-ignore
			create.preloadedValue = value

			return create as (() => QueryState<R>) & { preloadedValue: R }
		},
	}
}

export type QueryListOptions<K extends QueryKey> = Omit<
	QueryOptions<K, number[]>,
	'onDatabaseChange' | 'initialValue'
>

export const defineListQuery = <const StoreName extends AppStoreNames, const K extends QueryKey>(
	storeName: () => StoreName,
	options: QueryListOptions<K>,
) =>
	defineQuery({
		...options,
		onDatabaseChange: (changes, { mutate, refetch }) => {
			const name = storeName()

			let needRefetch = false
			for (const change of changes) {
				if (change.storeName !== name) {
					continue
				}

				if (change.operation === 'add') {
					// We have no way of knowing where should the new item be inserted.
					// So we just refetch the whole list.
					needRefetch = true
					break
				}

				const id = change.id
				if (change.operation === 'delete' && id !== undefined) {
					mutate((value) => {
						if (!value) {
							return value
						}

						const index = value.indexOf(id)
						value.splice(index, 1)

						return value
					})
				}
			}

			if (needRefetch) {
				refetch()
			}
		},
	})
