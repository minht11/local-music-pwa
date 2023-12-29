import { untrack } from 'svelte'
import type { WeakLRUCache } from 'weak-lru-cache'
import { assign } from './utils'

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

export interface QueryOptions<K, R> {
	cache: WeakLRUCache<K, R>
	key: () => K
	fetcher: (key: K) => Promise<R>
	onDatabaseChange: (event: IDBValidKey, actions: { mutate: (value: R) => void }) => void
	initialValue?: R
}

export const useDbQuery = <K, R>(options: QueryOptions<K, R>) => {
	const { cache } = options

	type InternalState = Omit<QueryState<K, R>, 'loading'>

	const getLoadedState = (value: R): InternalState => ({
		status: 'loaded',
		value,
		error: undefined,
		key: options.key(),
	})

	const getInitialValue = (key: K): InternalState => {
		const value = cache.getValue(key) ?? options.initialValue

		if (value) {
			return getLoadedState(value)
		}

		return {
			status: 'loading',
			error: undefined,
			value: undefined,
			key: undefined,
		}
	}

	const state = $state<InternalState>(getInitialValue(options.key()))

	const load = async () => {
		const key = options.key()

		// Attempt to load data from cache
		const value = cache.getValue(key)
		if (value) {
			assign(state, getLoadedState(value))

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
		const key = options.key()

		if (state.key !== key) {
			void untrack(load)
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
	} as QueryState<K, R>
}
