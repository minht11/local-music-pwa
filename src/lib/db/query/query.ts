import {
	type QueryBaseOptions,
	QueryImpl,
	type QueryKey,
	type QueryResult,
	QueryResultBox,
} from './base-query.svelte.ts'

export type { QueryKey, QueryResult } from './base-query.svelte.ts'

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
