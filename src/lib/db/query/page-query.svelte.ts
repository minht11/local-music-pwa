import { unwrap } from '$lib/helpers/utils/unwrap.ts'
import { untrack } from 'svelte'
import type { AppStoreNames } from '../database.ts'
import {
	type QueryBaseOptions,
	QueryImpl,
	type QueryKey,
	type QueryResult,
	QueryResultBox,
	type QueryStateInternal,
} from './base-query.svelte.ts'
import { keysListDatabaseChangeHandler, prefetchLibraryListItems } from './helpers.ts'

export type PageQueryResult<Result> = QueryResult<Result> & {
	value: Result
}
export type PageQueryOptions<K extends QueryKey, Result> = QueryBaseOptions<K, Result>

const pageQueryHydrateSymbol: unique symbol = Symbol()

export class PageQueryResultBox<Result> extends QueryResultBox<Result> {
	#setupListeners: () => void

	constructor(state: QueryStateInternal<Result>, setupListeners: () => void) {
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
export const createPageQuery = async <const K extends QueryKey, Result>(
	options: PageQueryOptions<K, Result>,
): Promise<PageQueryResult<Result>> => {
	const query = new QueryImpl<K, Result>(options)
	const { state } = query
	
	await query.load()
	
	if (state.error) {
		throw state.error
	}

	const result = new PageQueryResultBox<Result>(
		state,
		query.setupListeners,
	) as PageQueryResult<Result>

	return result
}

/**
 * Initialize pages queries once page is loaded.
 * Should be called inside page component.
 */
export const initPageQueries = (data: Record<string, unknown>): void => {
	for (const query of Object.values(data)) {
		if (query instanceof PageQueryResultBox) {
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

export type PageQueryListOptions<K extends QueryKey> = Omit<
	PageQueryOptions<K, number[]>,
	'onDatabaseChange'
>

export const createPageListQuery = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends QueryKey,
>(
	storeName: StoreName | (() => StoreName),
	options: PageQueryListOptions<K>,
): Promise<PageQueryResult<number[]>> =>
	createPageQuery({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			await prefetchLibraryListItems(unwrap(storeName), result)

			return result
		},
		onDatabaseChange: keysListDatabaseChangeHandler.bind(null, unwrap(storeName)),
	})
