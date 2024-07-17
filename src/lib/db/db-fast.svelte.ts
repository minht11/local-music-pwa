import { assign } from '$lib/helpers/utils'
import { untrack } from 'svelte'
import { WeakLRUCache } from 'weak-lru-cache'
import { type DBChangeRecordList, listenForDatabaseChanges } from './channel.ts'
import type { AppStoreNames } from './get-db.ts'

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

export const setCacheValue = <const K extends QueryKey, R>(key: K, value: R) => {
	cache.setValue(normalizeKey(key), value)
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
		if (untrack(() => state.key) !== normalizeKey(getKey())) {
			void untrack(load)
		}
	})

	$effect(() => {
		const stopListening = untrack(() =>
			listenForDatabaseChanges((changes) => {
				options.onDatabaseChange?.(changes, {
					mutate: (v) => {
						let value: R | undefined
						if (typeof v === 'function') {
							// @ts-expect-error TODO
							value = v(state.value)
						} else {
							value = v
						}

						if (!options.disableCache) {
							cache.setValue(normalizeKey(getKey()), value)
						}

						assign(state, getLoadedState(value as R))
					},
					refetch: () => load(true),
				})
			}),
		)

		return () => {
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

interface PageQueryOptions<K extends QueryKey, R> {
	key: K | (() => K)
	fetcher: (key: K) => Promise<R> | R
	onDatabaseChange?: (
		changes: DBChangeRecordList,
		actions: { mutate: QueryMutate<R | undefined>; refetch: () => void },
	) => void
}

class PageQuery<const K extends QueryKey, R> {
	#hydrated = false

	options: PageQueryOptions<K, R>

	#state = $state<{
		value: R | undefined
		resolvedKey: string
	}>({
		value: undefined,
		resolvedKey: '',
	})

	get value() {
		if (!this.#hydrated) {
			throw new Error('PageQuery not hydrated')
		}

		return this.#state.value as R
	}

	set value(v: R) {
		this.#state.value = v
	}

	getKey() {
		const key = this.options.key

		return typeof key === 'function' ? key() : key
	}

	constructor(options: PageQueryOptions<K, R>) {
		this.options = options
	}

	#fetch = async () => {
		const key = this.getKey()
		const resolvedKey = normalizeKey(key)

		const newValue = await this.options.fetcher(key)

		this.#state.value = newValue
		this.#state.resolvedKey = resolvedKey

		return newValue
	}

	preload = async () => {
		const value = await this.#fetch()

		return value
	}

	hydrate() {
		this.#hydrated = true

		const { options } = this

		$effect(() => {
			if (untrack(() => this.#state.resolvedKey) !== normalizeKey(this.getKey())) {
				void untrack(this.#fetch)
			}
		})

		$effect(() => {
			const stopListening = untrack(() =>
				listenForDatabaseChanges((changes) => {
					options.onDatabaseChange?.(changes, {
						mutate: (v) => {
							let value: R | undefined
							if (typeof v === 'function') {
								// @ts-expect-error TODO
								value = v(this.#state.value)
							}

							this.#state.value = value
							this.#state.resolvedKey = normalizeKey(this.getKey())
						},
						refetch: () => this.#fetch(),
					})
				}),
			)
			return () => {
				stopListening()
			}
		})

		return this.value
	}
}

export const initPageQueries = (data: Record<string, unknown>) => {
	for (const query of Object.values(data)) {
		if (query instanceof PageQuery) {
			query.hydrate()
		}
	}
}

export const definePageQuery = <const K extends QueryKey, R>(options: PageQueryOptions<K, R>) =>
	new PageQuery(options)

export type QueryListOptions<K extends QueryKey> = Omit<
	QueryOptions<K, number[]>,
	'onDatabaseChange' | 'initialValue'
>

export const defineListQuery = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends QueryKey,
>(
	storeName: () => StoreName,
	options: QueryListOptions<K>,
) =>
	definePageQuery({
		...options,
		onDatabaseChange: (changes, { mutate, refetch }) => {
			const name = storeName()

			let needRefetch = false
			for (const change of changes) {
				if (change.storeName !== name) {
					continue
				}

				if (
					// We have no way of knowing where should the new item be inserted.
					// So we just refetch the whole list.
					change.operation === 'add' ||
					// If playlist name changes, order might change as well.
					(name === 'playlists' && change.operation === 'update')
				) {
					needRefetch = true
					break
				}

				if (change.operation === 'delete' && change.key !== undefined) {
					mutate((value) => {
						if (!value) {
							return value
						}

						const index = value.indexOf(change.key)
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
