/** biome-ignore-all lint/style/noRestrictedGlobals: implementation of typed IDBKeyRange */
import type { AppDB, AppIndexNames, AppStoreNames } from './database.ts'

type IndexKey<
	Store extends AppStoreNames,
	Index extends AppIndexNames<Store>,
> = AppDB[Store]['indexes'][Index]

/** `[a, b, c]` -> `[a] | [a, b] | [a, b, c]` */
type TuplePrefixes<T extends readonly unknown[]> = T extends readonly [...infer Init, unknown]
	? TuplePrefixes<Init> | T
	: never

/** Tuples have a fixed length, multiEntry index arrays do not. */
type IsTuple<T> = T extends readonly unknown[] ? (number extends T['length'] ? false : true) : false

/** Key matching one entry: an element for multiEntry indexes, the full tuple for compound ones. */
type ExactIndexKey<K> = K extends readonly (infer Element)[]
	? IsTuple<K> extends true
		? K
		: Element
	: K

type PrefixIndexKey<K> = K extends readonly unknown[]
	? IsTuple<K> extends true
		? TuplePrefixes<K>
		: never
	: never

/**
 * `IDBKeyRange.only` typed against the given store index.
 * @public
 */
export const keyRangeOnly = <
	Store extends AppStoreNames,
	Index extends AppIndexNames<Store> = AppIndexNames<Store>,
>(
	value: ExactIndexKey<IndexKey<Store, Index>>,
): IDBKeyRange => IDBKeyRange.only(value)

/**
 * Range covering every key of a compound index that starts with the given stuple prefix.
 * @public
 */
export const keyRangePrefix = <
	Store extends AppStoreNames,
	Index extends AppIndexNames<Store> = AppIndexNames<Store>,
>(
	prefix: PrefixIndexKey<IndexKey<Store, Index>>,
): IDBKeyRange =>
	// IndexedDB sorts arrays above numbers, dates, strings and binary,
	// so [...prefix, []] is an exclusive upper bound for all longer keys
	// sharing this prefix, no matter the type of the remaining components.
	IDBKeyRange.bound(prefix, [...prefix, []], false, true)
