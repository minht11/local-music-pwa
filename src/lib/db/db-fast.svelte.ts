import { assign } from '$lib/helpers/utils'
import { untrack } from 'svelte'
import { WeakLRUCache } from 'weak-lru-cache'
import { type DBChangeRecordList, channel } from './channel'

// Fast in memory cache so we do not need to
// call indexed db for every access
const cache = new WeakLRUCache<string, unknown>({
	cacheSize: 10_000,
})

export type QueryStatus = 'loading' | 'loaded' | 'error'

type QueryBaseState<K> = {
	status: QueryStatus
	key?: K
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

export type QueryState<K, R> = QueryBaseState<K> &
	(QueryLoadedState<R> | QueryLoadingState<R> | QueryErrorState<R>)

export type QueryMutate<R> = (value: R | ((prev: R) => void)) => void

export interface QueryOptions<K extends string, R> {
	key: K | (() => K)
	fetcher: (key: K) => Promise<R> | R
	onDatabaseChange?: (data: DBChangeRecordList, actions: { mutate: QueryMutate<R> }) => void
	initialValue?: R
}

export const createQuery = <K extends string, R>(options: QueryOptions<K, R>) => {
	type InternalState = Omit<QueryState<K, R>, 'loading'>

	const getKey = () => (typeof options.key === 'function' ? options.key() : options.key)

	const getLoadedState = (value: R): InternalState => ({
		status: 'loaded',
		value,
		error: undefined,
		key: getKey(),
	})

	const getInitialValue = (key: K): InternalState => {
		const value = cache.getValue(key) ?? options.initialValue

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

	const load = async () => {
		const key = getKey()

		// Attempt to load data from cache
		const value = cache.getValue(key)
		if (value) {
			assign(state, getLoadedState(value as R))

			return
		}

		assign(state, {
			status: 'loading',
			error: undefined,
		})

		try {
			const value = await options.fetcher(key)
			cache.setValue(key, value)

			assign(state, getLoadedState(value))
		} catch (e) {
			assign(state, {
				status: 'error',
				value: undefined,
				error: e,
				key,
			})
		}
	}

	$effect(() => {
		if (state.key !== getKey()) {
			void untrack(load)
		}
	})

	channel.addEventListener('message', (e) => {
		const changes = e.data as DBChangeRecordList

		options.onDatabaseChange?.(changes, {
			mutate: (v) => {
				let value: R | undefined
				if (typeof v === 'function') {
					// @ts-expect-error TODO
					value = v(state.value)
				}

				cache.setValue(getKey(), value)
				assign(state, getLoadedState(value as R))
			},
		})
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
	} as QueryState<K, R>
}

export const defineQuery = <K extends string, R>(options: QueryOptions<K, R>) => {
	const preload = async () => {
		const key = typeof options.key === 'function' ? options.key() : options.key
		const value = await options.fetcher(key)

		cache.setValue(key, value)
	}

	const create = () => createQuery(options)

	return {
		preload,
		create,
		createPreloaded: async () => {
			await preload()

			return create
		},
	}
}
