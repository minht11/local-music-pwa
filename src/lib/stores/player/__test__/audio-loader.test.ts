import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioLoader } from '$lib/stores/player/audio-loader.svelte.ts'

const createObjectURL = vi.fn((file: File) => `blob:mock/${file.name}`)
const revokeObjectURL = vi.fn()

vi.stubGlobal('URL', {
	createObjectURL,
	revokeObjectURL,
})

const makeHandle = (permission: PermissionState, file = new File([''], 'track.mp3')) =>
	({
		queryPermission: vi.fn().mockResolvedValue(permission),
		requestPermission: vi.fn().mockResolvedValue(permission),
		getFile: vi.fn().mockResolvedValue(file),
	}) as unknown as FileSystemFileHandle

const makeSlowHandle = () => {
	const { promise, resolve } = Promise.withResolvers<File>()

	const handle = {
		queryPermission: vi.fn().mockResolvedValue('granted' as PermissionState),
		getFile: vi.fn().mockReturnValue(promise),
	} as unknown as FileSystemFileHandle

	return { handle, resolveFile: resolve }
}

describe('AudioLoader', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('starts with loading false', () => {
		expect(new AudioLoader(vi.fn()).loading).toBe(false)
	})

	describe('load()', () => {
		it('returns loaded and calls onSrc with the blob URL for a plain File', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)

			expect(await loader.load(new File([''], 'song.mp3'))).toBe('loaded')
			expect(onSrc).toHaveBeenLastCalledWith('blob:mock/song.mp3')
			expect(loader.loading).toBe(false)
		})

		it('returns loaded for a granted FileSystemFileHandle', async () => {
			const onSrc = vi.fn()
			const file = new File([''], 'song.mp3')

			expect(await new AudioLoader(onSrc).load(makeHandle('granted', file))).toBe('loaded')
			expect(onSrc).toHaveBeenLastCalledWith('blob:mock/song.mp3')
		})

		it('returns failed when permission is denied', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)

			expect(await loader.load(makeHandle('denied'))).toBe('failed')
			expect(onSrc).not.toHaveBeenCalledWith(expect.stringContaining('blob:'))
			expect(loader.loading).toBe(false)
		})

		it('requests permission when state is prompt', async () => {
			const handle = makeHandle('prompt')
			await new AudioLoader(vi.fn()).load(handle)
			expect(handle.requestPermission).toHaveBeenCalled()
		})

		it('revokes previous blob URL before loading a new file', async () => {
			const loader = new AudioLoader(vi.fn())
			await loader.load(new File([''], 'first.mp3'))
			await loader.load(new File([''], 'second.mp3'))
			expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/first.mp3')
		})

		it('returns superseded when a newer load races ahead', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			const { handle, resolveFile } = makeSlowHandle()

			const slow = loader.load(handle)
			const fast = loader.load(new File([''], 'fast.mp3'))
			resolveFile(new File([''], 'slow.mp3'))

			const [slowResult, fastResult] = await Promise.all([slow, fast])
			expect(slowResult).toBe('superseded')
			expect(fastResult).toBe('loaded')
			expect(onSrc).toHaveBeenLastCalledWith('blob:mock/fast.mp3')
		})
	})

	describe('reset()', () => {
		it('calls onSrc(null), revokes blob URL, and sets loading false', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			await loader.load(new File([''], 'song.mp3'))

			loader.reset()

			expect(onSrc).toHaveBeenLastCalledWith(null)
			expect(loader.loading).toBe(false)
			expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/song.mp3')
		})

		it('makes an in-flight load return superseded', async () => {
			const loader = new AudioLoader(vi.fn())
			const { handle, resolveFile } = makeSlowHandle()

			const pending = loader.load(handle)
			loader.reset()
			resolveFile(new File([''], 'song.mp3'))

			expect(await pending).toBe('superseded')
			expect(loader.loading).toBe(false)
		})
	})
})
