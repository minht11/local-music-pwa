import { assign } from '$lib/helpers/utils/assign.ts'
import { unwrap } from '$lib/helpers/utils/unwrap.ts'
import { untrack } from 'svelte'
import { type DBChangeRecordList, listenForDatabaseChanges } from './channel.ts'
import type { AppStoreNames } from './get-db.ts'
import { preloadLibraryEntityData } from './query.ts'

export type LoaderStatus = 'loading' | 'loaded' | 'error'

type LoaderBaseState = {
	status: LoaderStatus
}

type LoaderLoadedState<Result> = {
	status: 'loaded'
	loading: false
	value: Result
	error: undefined
}

type LoaderLoadingState<Result, InitialResult extends Result | undefined> = {
	status: 'loading'
	loading: true
	value: Result | InitialResult
	error: undefined
}

type LoaderErrorState<Result, InitialResult extends Result | undefined> = {
	status: 'error'
	loading: false
	value: Result | InitialResult
	error: unknown
}

export type LoaderState<Result, InitialResult extends Result | undefined> = LoaderBaseState &
	(
		| LoaderLoadedState<Result>
		| LoaderLoadingState<Result, InitialResult>
		| LoaderErrorState<Result, InitialResult>
	)

export type LoaderMutate<Result, InitialResult extends Result | undefined> = (
	value: Result | ((prev: Result | InitialResult) => void),
) => void

export type DbChangeActions<Result, InitialResult extends Result | undefined> = {
	mutate: LoaderMutate<Result, InitialResult>
	refetch: () => void
}

export type DatabaseChangeHandler<Result, InitialResult extends Result | undefined = undefined> = (
	changes: DBChangeRecordList,
	actions: DbChangeActions<Result, InitialResult>,
) => void

export type LoaderKeyPrimitiveValue = number | string | boolean
export type LoaderKey = LoaderKeyPrimitiveValue | LoaderKeyPrimitiveValue[]

const normalizeKey = <const K extends LoaderKey>(key: K) => JSON.stringify(key)

export interface LoaderOptions<
	K extends LoaderKey,
	Result,
	InitialResult extends Result | undefined,
> {
	key: K | (() => K)
	fetcher: (key: K) => Promise<Result> | Result
	onError?: (error: unknown) => void
	initialValue?: InitialResult
	onDatabaseChange?: DatabaseChangeHandler<Result, InitialResult>
	eager?: boolean
}

type LoaderStateInternal<Result, InitialResult extends Result | undefined> = Omit<
	LoaderState<Result, InitialResult>,
	'loading'
> & {
	resolvedKey: string | undefined
}

class LoaderImpl<K extends LoaderKey, Result, InitialResult extends Result | undefined> {
	/** Marks if database and key listeners initialized */
	listenersInitialized = false

	// biome-ignore lint/style/noNonNullAssertion: assignment is done in constructor
	state: LoaderStateInternal<Result, InitialResult> = $state()!

	options: LoaderOptions<K, Result, InitialResult>

	constructor(options: LoaderOptions<K, Result, InitialResult>) {
		this.options = options

		// @ts-ignore TODO
		const value = options.initialValue

		const resolvedState: LoaderStateInternal<Result, InitialResult> =
			value !== undefined
				? this.#getLoadedState(value as Result, normalizeKey(this.#getKey()))
				: {
						status: 'loading',
						error: undefined,
						value: undefined as InitialResult,
						resolvedKey: undefined,
					}

		this.state = resolvedState
	}

	#getKey() {
		const key = this.options.key

		return typeof key === 'function' ? key() : key
	}

	#getLoadedState(
		value: Result,
		resolvedKey: string,
	): LoaderStateInternal<Result, InitialResult> {
		return {
			status: 'loaded',
			value,
			error: undefined,
			resolvedKey,
		}
	}

	#setErrorState = (e: unknown, normalizedKey: string) => {
		assign(this.state, {
			status: 'error',
			value: undefined,
			error: e,
			resolvedKey: normalizedKey,
		})
		this.options.onError?.(e)
	}

	#setLoadedState = (value: Result, normalizedKey: string) => {
		assign(this.state, this.#getLoadedState(value, normalizedKey))
	}

	#load = (key: K, normalizedKey: string) => {
		const state = this.state

		try {
			const result = this.options.fetcher(key)

			if (result instanceof Promise) {
				result
					.then((value) => {
						// We only need to set loading state if it is async
						assign(state, {
							status: 'loading',
							error: undefined,
							resolvedKey: normalizedKey,
						})

						this.#setLoadedState(value, normalizedKey)
					})
					.catch((e) => {
						this.#setErrorState(e, normalizedKey)
					})
			} else {
				this.#setLoadedState(result, normalizedKey)
			}
		} catch (e) {
			this.#setErrorState(e, normalizedKey)
		}
	}

	load = (): void => {
		const key = this.#getKey()
		const normalizedKey = normalizeKey(key)

		this.#load(key, normalizedKey)
	}

	setupListeners(): void {
		this.listenersInitialized = true

		const { options } = this

		$effect(() => {
			const key = this.#getKey()
			const normalizedKey = normalizeKey(key)

			untrack(() => {
				if (this.state.resolvedKey === normalizedKey) {
					return
				}

				this.#load(key, normalizedKey)
			})
		})

		$effect(() => {
			const stopListening = untrack(() =>
				listenForDatabaseChanges((changes) => {
					options.onDatabaseChange?.(changes, {
						mutate: (v) => {
							let value: Result | InitialResult = this.options
								.initialValue as InitialResult
							if (typeof v === 'function') {
								const accessor = v as (prev: Result | undefined) => Result
								value = accessor(this.state.value)
							}

							this.state.value = value
							this.state.resolvedKey = normalizeKey(this.#getKey())
						},
						refetch: () => this.load(),
					})
				}),
			)
			return () => {
				this.listenersInitialized = false
				stopListening()
			}
		})
	}
}

export type LoaderResult<Result, InitialResult extends Result | undefined> = LoaderState<
	Result,
	InitialResult
>

const createQueryStateAccessor = <T, Result, InitialResult extends Result | undefined>(
	target: T,
	state: LoaderImpl<'', Result, InitialResult>['state'],
	additionalProperties?: Record<string, { get(): unknown }>,
) =>
	Object.defineProperties(target, {
		value: {
			get() {
				return state.value
			},
		},
		error: {
			get() {
				return state.error
			},
		},
		status: {
			get() {
				return state.status
			},
		},
		loading: {
			get() {
				return state.status === 'loading'
			},
		},
		[pageLoaderImplSymbol]: {
			value: true,
		},
		...additionalProperties,
	})

export const createLoader = <
	const K extends LoaderKey,
	Result,
	InitialResult extends Result | undefined,
>(
	options: LoaderOptions<K, Result, InitialResult>,
) => {
	const query = new LoaderImpl<K, Result, InitialResult>(options)
	const state = query.state

	if (options.eager) {
		query.load()
	}
	query.setupListeners()

	return createQueryStateAccessor({}, state) as LoaderResult<Result, InitialResult>
}

const pageLoaderImplSymbol: unique symbol = Symbol()

export type PageLoaderResultResolved<Result> = LoaderResult<Result, Result> & {
	hydrate(): void
}

export type PageLoaderResult<Result> = Promise<PageLoaderResultResolved<Result>>

export const definePageLoader = async <
	const K extends LoaderKey,
	Result,
	InitialResult extends Result | undefined = undefined,
>(
	options: LoaderOptions<K, Result, InitialResult>,
) => {
	const query = new LoaderImpl<K, Result, InitialResult>(options)
	const state = query.state

	const { resolve, reject, promise } = Promise.withResolvers<PageLoaderResultResolved<Result>>()

	query.load()

	const cleanup = $effect.root(() => {
		$effect(() => {
			if (state.status === 'loaded') {
				cleanup()

				const accessor = createQueryStateAccessor(
					{
						hydrate() {
							query.setupListeners()
						},
					},
					state,
					{
						value: {
							get() {
								// if (!query.listenersInitialized) {
								// 	throw new Error('PageLoader not hydrated')
								// }

								return state.value
							},
						},
					},
				)

				resolve(accessor as PageLoaderResultResolved<Result>)
			} else if (state.status === 'error') {
				cleanup()
				reject(state.error)
			}
		})
	})

	return promise
}

export const initPageQueries = (data: Record<string, unknown>): void => {
	for (const query of Object.values(data)) {
		if (query && typeof query === 'object' && pageLoaderImplSymbol in query) {
			;(query as unknown as PageLoaderResultResolved<unknown>).hydrate()
		}
	}
}

export const keysListDatabaseChangeHandler = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
>(
	storeName: StoreName,
	changes: DBChangeRecordList,
	{ mutate, refetch }: DbChangeActions<number[], undefined>,
) => {
	let needRefetch = false
	for (const change of changes) {
		if (change.storeName !== storeName) {
			continue
		}

		if (
			// We have no way of knowing where should the new item be inserted.
			// So we just refetch the whole list.
			change.operation === 'add' ||
			// If playlist name changes, order might change as well.
			(storeName === 'playlists' && change.operation === 'update')
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
}

export const prefetchLibraryListItems = async <const StoreName extends AppStoreNames>(
	storeName: StoreName,
	keys: number[],
) => {
	if (
		storeName === 'tracks' ||
		storeName === 'albums' ||
		storeName === 'artists' ||
		storeName === 'playlists'
	) {
		const preload = Array.from({ length: Math.min(keys.length, 12) }, (_, index) =>
			// biome-ignore lint/style/noNonNullAssertion: index is bound checked
			preloadLibraryEntityData(storeName as 'tracks', keys[index]!),
		)
		await Promise.all(preload)
	} else if (import.meta.env.DEV) {
		console.warn(`Cannot prefetch ${storeName} items`)
	}
}

export type LoaderListOptions<K extends LoaderKey> = Omit<
	LoaderOptions<K, number[], undefined>,
	'onDatabaseChange'
>

export const definePageListLoader = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends LoaderKey,
>(
	storeName: StoreName | (() => StoreName),
	options: LoaderListOptions<K>,
): PageLoaderResult<number[]> =>
	definePageLoader({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			await prefetchLibraryListItems(unwrap(storeName), result)

			return result
		},
		onDatabaseChange: keysListDatabaseChangeHandler.bind(null, unwrap(storeName)),
	})

export const createListLoader = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends LoaderKey,
>(
	storeName: StoreName,
	options: LoaderListOptions<K>,
): LoaderResult<number[], undefined> =>
	createLoader({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			await prefetchLibraryListItems(storeName, result)

			return result
		},
		onDatabaseChange: keysListDatabaseChangeHandler.bind(null, storeName),
	})
