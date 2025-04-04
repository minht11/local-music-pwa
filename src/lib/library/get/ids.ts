import { type AppDB, getDatabase } from '$lib/db/database'
import type { IDBPIndex, IndexNames } from 'idb'
import type { LibraryItemStoreName } from '../types.ts'

export type SortOrder = 'asc' | 'desc'
export type LibraryItemSortKey<Store extends LibraryItemStoreName> = Exclude<
    IndexNames<AppDB, Store>,
    symbol
>

export interface SortOptions<Store extends LibraryItemStoreName> {
    sort: LibraryItemSortKey<Store>
    order?: SortOrder
    searchTerm?: string
    searchFn?: (value: AppDB[Store]['value'], term: string) => boolean
}

type GetLibraryItemIdsIndex<Store extends LibraryItemStoreName> = IDBPIndex<
    AppDB,
    [Store],
    Store,
    keyof AppDB[Store]['indexes'] & string
>

const getLibraryItemIdsWithSearchSlow = async <Store extends LibraryItemStoreName>(
    storeIndex: GetLibraryItemIdsIndex<Store>,
    searchTerm: string,
    searchFn: (value: AppDB[Store]['value'], term: string) => boolean,
) => {
    const data: number[] = []

    for await (const cursor of storeIndex.iterate()) {
        if (searchFn(cursor.value, searchTerm)) {
            data.push(cursor.primaryKey)
        }
    }

    return data
}

export const getLibraryItemIds = async <Store extends LibraryItemStoreName>(
    store: Store,
    options: SortOptions<Store>,
): Promise<number[]> => {
    const db = await getDatabase()
    const storeIndex = db.transaction(store).store.index(options.sort)

    const { searchTerm, searchFn } = options

    let data: number[]
    if (searchTerm && searchFn) {
        data = await getLibraryItemIdsWithSearchSlow(storeIndex, searchTerm, searchFn)
    } else {
        // Fast path
        data = await db.getAllKeysFromIndex(store, options.sort)
    }

    if (options.order === 'desc') {
        data.reverse()
    }

    return data
}
