import { unwrap } from '$lib/helpers/utils/unwrap.ts'
import { untrack } from 'svelte'
import type { AppStoreNames } from '../database.ts'
import {
	QueryImpl,
	type QueryKey,
	type QueryListOptions,
	type QueryOptions,
	QueryResult,
	type QueryStateInternal,
} from './base-query.svelte.ts'
import { keysListDatabaseChangeHandler, prefetchLibraryListItems } from './helpers.ts'

export type { QueryListOptions, QueryOptions, QueryResult } from './base-query.svelte.ts'

const pageQueryHydrateSymbol: unique symbol = Symbol()

export class PageQueryResult<Result, InitialResult extends Result | undefined = Result> extends QueryResult<Result, InitialResult> {
	#setupListeners: () => void

	constructor(state: QueryStateInternal<Result, InitialResult>, setupListeners: () => void) {
		super(state)
		this.#setupListeners = setupListeners
	}

	[pageQueryHydrateSymbol](): void {
		this.#setupListeners()
	}
}

/**
 * Create a page query which should load data inside load function
 * and then listen for database changes once page is loaded.
 */
export const createPageQuery = async <
	const K extends QueryKey,
	Result,
	InitialResult extends Result | undefined = Result,
>(
	options: QueryOptions<K, Result, InitialResult>,
): Promise<PageQueryResult<Result, InitialResult>> => {
	const query = new QueryImpl<K, Result, InitialResult>(options)
	await query.load()

	const result = new PageQueryResult<Result, InitialResult>(query.state, query.setupListeners)

	return result
}

/**
 * Initialize pages queries once page is loaded.
 * Should be called inside page component.
 */
export const initPageQueries = (data: Record<string, unknown>): void => {
	for (const query of Object.values(data)) {
		if (query instanceof PageQueryResult) {
			query[pageQueryHydrateSymbol]()
		}
	}
}

/**
 * Initialize pages queries once page is loaded.
 * Similar to `initPageQueries` with the main difference being
 * that it will reinitialize queries on every change of `source`.
 * Should be called inside page component.
 */
export const initPageQueriesDynamic = (
	source: () => unknown,
	data: () => Record<string, unknown>,
): void => {
	$effect.pre(() => {
		source() // track changes

		untrack(() => {
			initPageQueries(data())
		})
	})
}

export const createPageListQuery = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends QueryKey,
>(
	storeName: StoreName | (() => StoreName),
	options: QueryListOptions<K>,
): Promise<PageQueryResult<number[], undefined>> => createPageQuery<K, number[], undefined>({
	...options,
	fetcher: async (key) => {
		const result = await options.fetcher(key)
		await prefetchLibraryListItems(unwrap(storeName), result)

		return result
	},
	onDatabaseChange: keysListDatabaseChangeHandler.bind(null, unwrap(storeName)),
})
