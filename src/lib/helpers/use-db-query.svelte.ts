import { untrack } from 'svelte'
import type { WeakLRUCache } from 'weak-lru-cache'
import { assign } from './utils'

export interface QueryState<T, R> {
	error?: unknown
	loading: boolean
	value?: R
	key?: T
}

export interface QueryOptions<T, R> {
	cache: WeakLRUCache<T, R>
	key: () => T
	fetcher: (key: T) => Promise<R>
	onDatabaseChange: (event: IDBValidKey, actions: { mutate: (value: R) => void }) => void
	initialValue?: R
}

export const useDbQuery = <T, R>(options: QueryOptions<T, R>) => {
	const { cache } = options

	const getLoadedState = (value: R): QueryState<T, R> => ({
		value,
		loading: false,
		error: undefined,
		key: options.key(),
	})

	const getInitialValue = (key: T): QueryState<T, R> => {
		const value = cache.getValue(key) ?? options.initialValue

		if (value) {
			return getLoadedState(value)
		}

		return {
			error: undefined,
			loading: true,
			value: undefined,
			key: undefined,
		}
	}

	const state = $state<QueryState<T, R>>(getInitialValue(options.key()))

	const load = async () => {
		const key = options.key()

		// Attempt to load data from cache
		const value = cache.getValue(key)
		if (value) {
			assign(state, getLoadedState(value))

			return
		}

		state.loading = true

		try {
			const value = await options.fetcher(key)
			assign(state, getLoadedState(value))
		} catch (e) {
			assign(state, {
				value: undefined,
				error: e,
				key,
			})
		} finally {
			state.loading = false
		}
	}

	$effect(() => {
		const key = options.key()

		if (state.key !== key) {
			void untrack(load)
		}
	})

	return {
		get value() {
			return state.value
		},
		get loading() {
			return state.loading
		},
		get error() {
			return state.error
		},
	}
}
