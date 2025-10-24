import type { DatabaseChangeDetailsList } from '$lib/db/events.ts'
import type { DbChangeActions } from '$lib/db/query/base-query.svelte.ts'
import {
	createPageQuery,
	type PageQueryOptions,
	type PageQueryResult,
	type QueryKey,
} from '$lib/db/query/page-query.svelte.ts'
import type { LibraryStoreName } from '../types.ts'
import { preloadLibraryValue } from './value.ts'

export type { PageQueryResult } from '$lib/db/query/page-query.svelte.ts'
export type { QueryResult } from '$lib/db/query/query.ts'

const preloadLibraryListValues = async <Store extends LibraryStoreName>(
	storeName: Store,
	keys: number[],
) => {
	if (
		storeName === 'tracks' ||
		storeName === 'albums' ||
		storeName === 'artists' ||
		storeName === 'playlists'
	) {
		const preload = Array.from({ length: Math.min(keys.length, 12) }, (_, index) => {
			const id = keys[index]
			if (id) {
				return preloadLibraryValue(storeName, id)
			}

			return null
		})
		await Promise.all(preload)
	} else if (import.meta.env.DEV) {
		throw new Error(`Preloading ${storeName} is not supported`)
	}
}

export const keysListDatabaseChangeHandler = <Store extends LibraryStoreName>(
	storeName: Store,
	changes: DatabaseChangeDetailsList,
	{ mutate, refetch }: DbChangeActions<number[]>,
): void => {
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
					return []
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

export type LibraryItemKeysPageQueryOptions<K extends QueryKey> = Omit<
	PageQueryOptions<K, number[]>,
	'onDatabaseChange'
>

export const createLibraryItemKeysPageQuery = <
	Store extends LibraryStoreName,
	const K extends QueryKey,
>(
	storeName: Store,
	options: LibraryItemKeysPageQueryOptions<K>,
): Promise<PageQueryResult<number[]>> =>
	createPageQuery({
		...options,
		fetcher: async (key) => {
			const result = await options.fetcher(key)
			await preloadLibraryListValues(storeName, result)

			return result
		},
		onDatabaseChange: keysListDatabaseChangeHandler.bind(null, storeName),
	})
