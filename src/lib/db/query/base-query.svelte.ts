import { assign } from '$lib/helpers/utils/assign.ts'
import { untrack } from 'svelte'
import { type DatabaseChangeDetailsList, onDatabaseChange } from '../listener.ts'

export type QueryStatus = 'loading' | 'loaded' | 'error'

type QueryBaseResult = {
	status: QueryStatus
}

type QueryLoadedResult<Result> = {
	status: 'loaded'
	loading: false
	value: Result
	error: undefined
}

type QueryLoadingResult<Result> = {
	status: 'loading'
	loading: true
	value: Result | undefined
	error: undefined
}

type QueryErrorResult<Result> = {
	status: 'error'
	loading: false
	value: Result | undefined
	error: unknown
}

export type QueryResult<Result> = QueryBaseResult &
	(QueryLoadedResult<Result> | QueryLoadingResult<Result> | QueryErrorResult<Result>)

export type QueryMutate<Result> = (value: Result | ((prev: Result | undefined) => void)) => void

export type DbChangeActions<Result> = {
	mutate: QueryMutate<Result>
	refetch: () => void
}

export type DatabaseChangeHandler<Result> = (
	changes: DatabaseChangeDetailsList,
	actions: DbChangeActions<Result>,
) => void

export type QueryKeyPrimitiveValue = number | string | boolean
export type QueryKey = QueryKeyPrimitiveValue | QueryKeyPrimitiveValue[]

const normalizeKey = <const K extends QueryKey>(key: K) => JSON.stringify(key)

export interface QueryBaseOptions<K extends QueryKey, Result> {
	key: K | (() => K)
	fetcher: (key: K) => Promise<Result> | Result
	onError?: (error: unknown) => void
	onDatabaseChange?: DatabaseChangeHandler<Result>
}

export type QueryStateInternal<Result> = Omit<QueryResult<Result>, 'loading'>

export class QueryImpl<K extends QueryKey, Result> {
	state: QueryStateInternal<Result> = $state({
		status: 'loading',
		error: undefined,
		value: undefined,
	})

	resolvedKey: string | undefined = undefined

	options: QueryBaseOptions<K, Result>

	constructor(options: QueryBaseOptions<K, Result>) {
		this.options = options
	}

	#getKey() {
		const key = this.options.key

		return typeof key === 'function' ? key() : key
	}

	#setErrorState = (e: unknown, normalizedKey: string) => {
		this.resolvedKey = normalizedKey
		assign(this.state, {
			status: 'error',
			value: undefined,
			error: e,
		})
		this.options.onError?.(e)
	}

	#setLoadedState = (value: Result, normalizedKey: string) => {
		this.resolvedKey = normalizedKey
		assign(this.state, {
			status: 'loaded',
			value,
			error: undefined,
		})
	}

	#loadWithKey = (key: K, normalizedKey: string) => {
		const state = this.state

		const { promise, resolve } = Promise.withResolvers<void>()

		try {
			const result = this.options.fetcher(key)

			if (result instanceof Promise) {
				result
					.then((value) => {
						// We only need to set loading state if it is async
						assign(state, {
							status: 'loading',
							error: undefined,
						})

						this.#setLoadedState(value, normalizedKey)
					})
					.catch((e) => {
						this.#setErrorState(e, normalizedKey)
					})
					.finally(() => {
						resolve()
					})
			} else {
				this.#setLoadedState(result, normalizedKey)
				resolve()
			}
		} catch (e) {
			this.#setErrorState(e, normalizedKey)
			resolve()
		}

		return promise
	}

	load = (): Promise<void> => {
		const key = this.#getKey()
		const normalizedKey = normalizeKey(key)

		return this.#loadWithKey(key, normalizedKey)
	}

	setupListeners = (): void => {
		$effect(() => {
			const key = this.#getKey()
			const normalizedKey = normalizeKey(key)

			untrack(() => {
				if (this.resolvedKey === normalizedKey) {
					return
				}

				this.#loadWithKey(key, normalizedKey)
			})
		})

		$effect(() => {
			const stopListening = untrack(() =>
				onDatabaseChange((changes) => {
					this.options.onDatabaseChange?.(changes, {
						mutate: (v) => {
							let value: Result | undefined = undefined
							if (typeof v === 'function') {
								const accessor = v as (prev: Result | undefined) => Result
								value = accessor(this.state.value)
							}

							this.#setLoadedState(value as Result, normalizeKey(this.#getKey()))
						},
						refetch: async () => {
							await this.load()
						},
					})
				}),
			)
			return () => {
				stopListening()
			}
		})
	}
}

export class QueryResultBox<Result> {
	#state: QueryStateInternal<Result>

	constructor(state: QueryStateInternal<Result>) {
		this.#state = state
	}

	get value() {
		return this.#state.value
	}

	get error() {
		return this.#state.error
	}

	get status() {
		return this.#state.status
	}

	get loading() {
		return this.#state.status === 'loading'
	}
}
