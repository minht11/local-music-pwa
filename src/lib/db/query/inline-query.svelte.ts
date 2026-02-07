import { type DatabaseChangeDetailsList, onDatabaseChange } from '../events.ts'
import type { QueryKey } from './base-query.svelte.ts'

export type { QueryKey, QueryResult } from './base-query.svelte.ts'

export interface InlineQueryOptions<K extends QueryKey, Result> {
	key: K | (() => K)
	fetcher: (key: K) => Promise<Result> | Result
	onDatabaseChange?: (changes: DatabaseChangeDetailsList) => boolean
}

export const createInlineQuery = <const K extends QueryKey, Result>(
	options: InlineQueryOptions<K, Result>,
) => {
	let counter = $state(0)

	const load = () => {
		void counter
		const key = typeof options.key === 'function' ? options.key() : options.key

		return untrack(() => options.fetcher(key))
	}

	$effect(() => {
		const stopListening = untrack(() =>
			onDatabaseChange((changes) => {
				const changed = options.onDatabaseChange?.(changes)
				if (changed) {
					counter += 1
				}
			}),
		)
		return () => {
			stopListening()
		}
	})

	return load
}
