import { describe, expect, it, vi } from 'vitest'
import { getOrInsertAsync, type MapLike } from '../get-or-insert-async.ts'

function makeMap<K, V>(): MapLike<K, V> {
	const map = new Map<K, V | Promise<V | undefined>>()
	return {
		get: (key) => map.get(key),
		set: (key, value) => map.set(key, value),
		delete: (key) => map.delete(key),
	}
}

describe('getOrInsertAsync', () => {
	it('calls fetchValue and returns resolved value on cache miss', async () => {
		const cache = makeMap<string, number>()
		const fetch = vi.fn().mockResolvedValue(42)

		const result = await getOrInsertAsync(cache, 'a', fetch)

		expect(fetch).toHaveBeenCalledOnce()
		expect(result).toBe(42)
	})

	it('returns cached value synchronously on cache hit', () => {
		const cache = makeMap<string, number>()
		const fetch = vi.fn().mockResolvedValue(99)

		// Warm the cache
		cache.set('a', 42)

		const result = getOrInsertAsync(cache, 'a', fetch)

		expect(fetch).not.toHaveBeenCalled()
		expect(result).toBe(42)
	})

	it('coalesces concurrent fetches into a single call', async () => {
		const cache = makeMap<string, number>()
		let resolve!: (v: number) => void
		const promise = new Promise<number>((r) => (resolve = r))
		const fetch = vi.fn().mockReturnValue(promise)

		const r1 = getOrInsertAsync(cache, 'a', fetch)
		const r2 = getOrInsertAsync(cache, 'a', fetch)

		expect(fetch).toHaveBeenCalledOnce()
		expect(r1).toBe(r2)

		resolve(7)
		expect(await r1).toBe(7)
	})

	it('stores resolved value in cache after fetch completes', async () => {
		const cache = makeMap<string, number>()
		const fetch = vi.fn().mockResolvedValue(5)

		await getOrInsertAsync(cache, 'a', fetch)

		const second = getOrInsertAsync(cache, 'a', fetch)
		expect(fetch).toHaveBeenCalledOnce()
		expect(second).toBe(5)
	})

	it('removes cache entry when fetchValue resolves to undefined', async () => {
		const cache = makeMap<string, number>()
		const fetch = vi.fn().mockResolvedValue(undefined)

		const result = await getOrInsertAsync(cache, 'a', fetch)

		expect(result).toBeUndefined()
		expect(cache.get('a')).toBeUndefined()
	})

	it('removes cache entry when fetchValue rejects', async () => {
		const cache = makeMap<string, number>()
		const fetch = vi.fn().mockRejectedValue(new Error('oops'))

		await expect(getOrInsertAsync(cache, 'a', fetch)).rejects.toThrow('oops')
		expect(cache.get('a')).toBeUndefined()
	})

	it('does not overwrite a new entry with a stale resolved value', async () => {
		const cache = makeMap<string, number>()
		let resolve!: (v: number) => void
		const slowFetch = vi.fn().mockReturnValue(new Promise<number>((r) => (resolve = r)))

		const pending = getOrInsertAsync(cache, 'a', slowFetch)

		// Invalidate and replace with a fresh value before the fetch lands
		cache.delete('a')
		cache.set('a', 99)

		resolve(1)
		await pending

		expect(cache.get('a')).toBe(99)
	})
})
