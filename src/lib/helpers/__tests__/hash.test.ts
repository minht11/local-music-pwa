import { describe, expect, it } from 'vitest'
import { sha256Hex } from '$lib/helpers/hash.ts'

const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/

describe('sha256Hex', () => {
	it('produces a stable 64-char hex digest for identical bytes', async () => {
		const a = await sha256Hex(new Blob(['hello world']))
		const b = await sha256Hex(new Blob(['hello world']))

		expect(a).toBe(b)
		expect(a).toMatch(SHA256_HEX_REGEX)
	})

	it('produces different digests for different bytes', async () => {
		const a = await sha256Hex(new Blob(['cover-a']))
		const b = await sha256Hex(new Blob(['cover-b']))

		expect(a).not.toBe(b)
	})

	it('matches the known SHA-256 of "abc"', async () => {
		const digest = await sha256Hex(new Blob(['abc']))

		expect(digest).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
	})
})
