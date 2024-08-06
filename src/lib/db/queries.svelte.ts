import { assign, unwrap, wait } from '$lib/helpers/utils'
import { untrack } from 'svelte'
import { type DBChangeRecordList, listenForDatabaseChanges } from './channel.ts'
import type { AppStoreNames } from './get-db.ts'
import { prefetchLibraryEntityData } from './query.ts'

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

export type DatabaseChangeHandler<Result, InitialResult extends Result | undefined = undefined> = (
	changes: DBChangeRecordList,
	actions: { mutate: LoaderMutate<Result, InitialResult>; refetch: () => void },
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

	#load = (key: K, normalizedKey: string) => {
		const state = this.state

		assign(state, {
			status: 'loading',
			error: undefined,
			resolvedKey: normalizedKey,
		})

		try {
			const result = this.options.fetcher(key)

			if (result instanceof Promise) {
				result
					.then((value) => {
						assign(state, this.#getLoadedState(value, normalizedKey))
					})
					.catch((e) => {
						assign(state, {
							status: 'error',
							value: undefined,
							error: e,
							resolvedKey: normalizedKey,
						})
						this.options.onError?.(e)
					})
				return
			}

			assign(state, this.#getLoadedState(result, normalizedKey))
		} catch (e) {
			assign(state, {
				status: 'error',
				value: undefined,
				error: e,
				resolvedKey: normalizedKey,
			})
			this.options.onError?.(e)
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

export type PageLoaderResultResolved<
	Result,
	InitialResult extends Result | undefined,
> = LoaderResult<Result, InitialResult> & {
	hydrate(): void
}

export type PageLoaderResult<Result, InitialResult extends Result | undefined> = Promise<
	PageLoaderResultResolved<Result, Result>
> &
	PageLoaderResultResolved<Result, InitialResult>

export const definePageLoader = <
	const K extends LoaderKey,
	Result,
	InitialResult extends Result | undefined = undefined,
>(
	options: LoaderOptions<K, Result, InitialResult>,
) => {
	const query = new LoaderImpl<K, Result, InitialResult>(options)
	const state = query.state

	const createAccessor = <T extends {}>(target: T) => {
		Object.assign(target, {
			hydrate() {
				query.setupListeners()
			},
		})

		const main = createQueryStateAccessor(target, state, {
			value: {
				get() {
					// if (!query.listenersInitialized) {
					// 	throw new Error('PageLoader not hydrated')
					// }

					return state.value
				},
			},
		})

		return main
	}

	query.load()

	const { resolve, reject, promise } =
		Promise.withResolvers<PageLoaderResultResolved<Result, InitialResult>>()

	const promiseAugmented = createAccessor(promise)

	const cleanup = $effect.root(() => {
		$effect(() => {
			if (state.status === 'loaded') {
				cleanup()
				resolve(createAccessor({} as PageLoaderResultResolved<Result, InitialResult>))
			} else if (state.status === 'error') {
				cleanup()
				reject(state.error)
			}
		})
	})

	return promiseAugmented as PageLoaderResult<Result, InitialResult>
}

export const initPageQueries = (data: Record<string, unknown>): void => {
	for (const query of Object.values(data)) {
		if (query && typeof query === 'object' && pageLoaderImplSymbol in query) {
			;(query as unknown as PageLoaderResult<unknown, undefined>).hydrate()
		}
	}
}

export type LoaderListOptions<K extends LoaderKey> = Omit<
	LoaderOptions<K, number[], undefined>,
	'onDatabaseChange'
>

const createDatabaseChangeListKeysHandler = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
>(
	storeName: StoreName,
) => {
	const handler: DatabaseChangeHandler<number[]> = (changes, { mutate, refetch }) => {
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

	return handler
}

export const definePageListLoader = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends LoaderKey,
>(
	storeName: StoreName | (() => StoreName),
	options: LoaderListOptions<K>,
): PageLoaderResult<number[], undefined> =>
	definePageLoader({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			if (
				storeName === 'tracks' ||
				storeName === 'albums' ||
				storeName === 'artists' ||
				storeName === 'playlists'
			) {
				const preload = Array.from({ length: Math.min(result.length, 20) }, (_, index) =>
					// biome-ignore lint/style/noNonNullAssertion: index is bound checked
					prefetchLibraryEntityData(storeName as 'tracks', result[index]!),
				)
				await Promise.all(preload)
			}

			return result
		},
		onDatabaseChange: createDatabaseChangeListKeysHandler(unwrap(storeName)),
	})

// TODO. Preload item values
export const createListLoader = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends LoaderKey,
>(
	storeName: StoreName,
	options: LoaderListOptions<K>,
): LoaderResult<number[], undefined> =>
	createLoader({
		...options,
		onDatabaseChange: createDatabaseChangeListKeysHandler(storeName),
	})

// export const combineQuery =
