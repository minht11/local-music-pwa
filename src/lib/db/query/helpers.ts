import type { AppStoreNames } from '../database.ts'
import { preloadEntityData } from '../entity.ts'
import type { DatabaseChangeDetailsList } from '../listener.ts'
import type { DbChangeActions } from './base-query.svelte.ts'

// TODO. Circular imports
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
			preloadEntityData(storeName as 'tracks', keys[index]!),
		)
		await Promise.all(preload)
	} else if (import.meta.env.DEV) {
		console.warn(`Cannot prefetch ${storeName} items`)
	}
}


export const keysListDatabaseChangeHandler = <
    const StoreName extends Exclude<AppStoreNames, 'playlistsTracks'>,
>(
    storeName: StoreName,
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