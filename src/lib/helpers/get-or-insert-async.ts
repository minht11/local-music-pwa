/**
 * Minimal map contract. Entries hold either a
 * resolved value or the in-flight promise producing it.
 */
export interface MapLike<Key, Value> {
	get: (key: Key) => Value | Promise<Value | undefined> | undefined
	set: (key: Key, value: Value | Promise<Value | undefined>) => void
	delete: (key: Key) => void
}

/**
 * Returns the cached value for `key`, or starts `compute` and caches the
 * promise itself so concurrent callers share a single fetch.
 */
export const getOrInsertAsync = <Key, Value>(
	map: MapLike<Key, Value>,
	key: Key,
	compute: () => Promise<Value | undefined>,
): Value | Promise<Value | undefined> => {
	const cachedValue = map.get(key)
	if (cachedValue !== undefined) {
		return cachedValue
	}

	const promise = compute()
		.then((value) => {
			// The entry may have been invalidated while the fetch was in
			// flight, so the resolved value can already be stale. Only cache
			// it if this fetch is still the current entry.
			if (map.get(key) === promise) {
				if (value === undefined) {
					map.delete(key)
				} else {
					map.set(key, value)
				}
			}

			return value
		})
		.catch((error: unknown) => {
			if (map.get(key) === promise) {
				map.delete(key)
			}
			throw error
		})

	map.set(key, promise)

	return promise
}
