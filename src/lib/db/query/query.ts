import type { AppStoreNames } from '../database.ts'
import {
	QueryImpl,
	type QueryKey,
	type QueryListOptions,
	type QueryOptions,
	QueryResult,
} from './base-query.svelte.ts'
import { keysListDatabaseChangeHandler, prefetchLibraryListItems } from './helpers.ts'

export type { QueryListOptions, QueryOptions, QueryResult } from './base-query.svelte.ts'

export const createQuery = <
	const K extends QueryKey,
	Result,
	InitialResult extends Result | undefined,
>(
	options: QueryOptions<K, Result, InitialResult>,
) => {
	const query = new QueryImpl<K, Result, InitialResult>(options)
	if (options.eager) {
		query.load()
	}
	query.setupListeners()

	return new QueryResult(query.state)
}

export const createListQuery = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends QueryKey,
>(
	storeName: StoreName,
	options: QueryListOptions<K>,
): QueryResult<number[], undefined> =>
	createQuery({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			await prefetchLibraryListItems(storeName, result)

			return result
		},
		onDatabaseChange: keysListDatabaseChangeHandler.bind(null, storeName),
	})
