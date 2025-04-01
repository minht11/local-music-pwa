import type { AppStoreNames } from '../database.ts'
import {
	type QueryBaseOptions,
	QueryImpl,
	type QueryKey,
	type QueryResult,
	QueryResultBox,
} from './base-query.svelte.ts'
import { keysListDatabaseChangeHandler, prefetchLibraryListItems } from './helpers.ts'

export type { QueryResult } from './base-query.svelte.ts'

export interface QueryOptions<K extends QueryKey, Result>  extends QueryBaseOptions<K, Result> {
	/**
	 * Whether to load the query immediately
	 * @default false
	 */
	eager?: boolean
}

export const createQuery = <const K extends QueryKey, Result>(options: QueryOptions<K, Result>) => {
	const query = new QueryImpl<K, Result>(options)
	if (options.eager) {
		void query.load()
	}
	query.setupListeners()

	return new QueryResultBox(query.state) as QueryResult<Result>
}

export type QueryListOptions<K extends QueryKey> = Omit<
	QueryOptions<K, number[]>,
	'onDatabaseChange'
>

export const createListQuery = <
	const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
	const K extends QueryKey,
>(
	storeName: StoreName,
	options: QueryListOptions<K>,
): QueryResult<number[]> =>
	createQuery({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			await prefetchLibraryListItems(storeName, result)

			return result
		},
		onDatabaseChange: keysListDatabaseChangeHandler.bind(null, storeName),
	})
