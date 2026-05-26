import { afterEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
	vi.stubGlobal('AudioDecoder', class {})
})

vi.mock('$lib/helpers/utils/ua.ts', () => ({
	isSafari: vi.fn(() => false),
}))

const mockCanDecodeAudio = vi.hoisted(() => vi.fn(() => Promise.resolve(true)))

vi.mock('mediabunny', async (importOriginal) => {
	const original = await importOriginal<typeof import('mediabunny')>()
	return {
		...original,
		canDecodeAudio: mockCanDecodeAudio,
	}
})

afterEach(() => vi.clearAllMocks())

describe('supportsBufferEngine', () => {
	it('returns true synchronously for PCM codecs', async () => {
		const { supportsBufferEngine } = await import('../engine-buffer.svelte.ts')
		expect(supportsBufferEngine('pcm-s16')).toBe(true)
	})

	it('returns false for codecs that are neither PCM nor FLAC', async () => {
		const { supportsBufferEngine } = await import('../engine-buffer.svelte.ts')
		expect(supportsBufferEngine('mp3')).toBe(false)
		expect(supportsBufferEngine('aac')).toBe(false)
	})

	it('normalises codec to lowercase before matching', async () => {
		const { supportsBufferEngine } = await import('../engine-buffer.svelte.ts')
		expect(supportsBufferEngine('FLAC')).not.toBe(false)
	})

	it('returns false for FLAC on Safari', async () => {
		const { isSafari } = await import('$lib/helpers/utils/ua.ts')
		vi.mocked(isSafari).mockReturnValueOnce(true)

		const { supportsBufferEngine } = await import('../engine-buffer.svelte.ts')
		expect(await Promise.resolve(supportsBufferEngine('flac'))).toBe(false)
	})

	it('delegates to canDecodeAudio for FLAC on non-Safari', async () => {
		mockCanDecodeAudio.mockResolvedValue(true)

		const { supportsBufferEngine } = await import('../engine-buffer.svelte.ts')
		const result = await Promise.resolve(supportsBufferEngine('flac'))

		expect(mockCanDecodeAudio).toHaveBeenCalledWith('flac')
		expect(result).toBe(true)
	})

	it('returns false when canDecodeAudio reports FLAC is unsupported', async () => {
		mockCanDecodeAudio.mockResolvedValue(false)

		const { supportsBufferEngine } = await import('../engine-buffer.svelte.ts')
		expect(await Promise.resolve(supportsBufferEngine('flac'))).toBe(false)
	})
})
