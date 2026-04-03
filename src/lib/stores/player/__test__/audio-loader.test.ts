import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/helpers/utils/ua', () => ({
	isAndroid: () => false,
	isChromiumBased: () => false,
}))

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

			expect(await loader.load(-1, new File([''], 'song.mp3'))).toEqual({ status: 'loaded' })
			expect(onSrc).toHaveBeenLastCalledWith('blob:mock/song.mp3')
			expect(loader.loading).toBe(false)
		})

		it('returns loaded for a granted FileSystemFileHandle', async () => {
			const onSrc = vi.fn()
			const file = new File([''], 'song.mp3')

			expect(await new AudioLoader(onSrc).load(1, makeHandle('granted', file))).toEqual({
				status: 'loaded',
			})
			expect(onSrc).toHaveBeenLastCalledWith('blob:mock/song.mp3')
		})

		it('returns failed when permission is denied', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)

			expect(await loader.load(1, makeHandle('denied'))).toEqual({
				status: 'failed',
				reason: 'permission-denied',
			})
			expect(onSrc).not.toHaveBeenCalledWith(expect.stringContaining('blob:'))
			expect(loader.loading).toBe(false)
		})

		it('returns failed when prompt permission request throws', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			const handle = {
				queryPermission: vi.fn().mockResolvedValue('prompt' as PermissionState),
				requestPermission: vi.fn().mockRejectedValue(new Error('user activation required')),
				getFile: vi.fn(),
			} as unknown as FileSystemFileHandle

			expect(await loader.load(1, handle)).toEqual({
				status: 'failed',
				reason: 'permission-denied',
			})
			expect(handle.requestPermission).toHaveBeenCalled()
			expect(handle.getFile).not.toHaveBeenCalled()
			expect(loader.loading).toBe(false)
		})

		it('returns failed with reason not-found when getFile throws NotFoundError', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			const handle = {
				queryPermission: vi.fn().mockResolvedValue('granted' as PermissionState),
				requestPermission: vi.fn(),
				getFile: vi.fn().mockRejectedValue(new DOMException('missing', 'NotFoundError')),
			} as unknown as FileSystemFileHandle

			expect(await loader.load(1, handle)).toEqual({
				status: 'failed',
				reason: 'not-found',
			})
			expect(loader.loading).toBe(false)
		})

		it('returns failed with reason error when getFile throws unknown error', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
			const handle = {
				queryPermission: vi.fn().mockResolvedValue('granted' as PermissionState),
				requestPermission: vi.fn(),
				getFile: vi.fn().mockRejectedValue(new Error('boom')),
			} as unknown as FileSystemFileHandle

			expect(await loader.load(1, handle)).toEqual({
				status: 'failed',
				reason: 'error',
			})
			expect(consoleError).toHaveBeenCalled()
			expect(loader.loading).toBe(false)
		})

		it('requests permission when state is prompt', async () => {
			const handle = makeHandle('prompt')
			await new AudioLoader(vi.fn()).load(1, handle)
			expect(handle.requestPermission).toHaveBeenCalled()
		})

		it('revokes previous blob URL before loading a new file', async () => {
			const loader = new AudioLoader(vi.fn())
			await loader.load(-1, new File([''], 'first.mp3'))
			await loader.load(-1, new File([''], 'second.mp3'))
			expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/first.mp3')
		})

		it('returns superseded when a newer load races ahead', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			const { handle, resolveFile } = makeSlowHandle()

			const slow = loader.load(1, handle)
			const fast = loader.load(-1, new File([''], 'fast.mp3'))
			resolveFile(new File([''], 'slow.mp3'))

			const [slowResult, fastResult] = await Promise.all([slow, fast])
			expect(slowResult).toEqual({ status: 'superseded' })
			expect(fastResult).toEqual({ status: 'loaded' })
			expect(onSrc).toHaveBeenLastCalledWith('blob:mock/fast.mp3')
		})
	})

	describe('reset()', () => {
		it('calls onSrc(null), revokes blob URL, and sets loading false', async () => {
			const onSrc = vi.fn()
			const loader = new AudioLoader(onSrc)
			await loader.load(-1, new File([''], 'song.mp3'))

			loader.reset()

			expect(onSrc).toHaveBeenLastCalledWith(null)
			expect(loader.loading).toBe(false)
			expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/song.mp3')
		})

		it('makes an in-flight load return superseded', async () => {
			const loader = new AudioLoader(vi.fn())
			const { handle, resolveFile } = makeSlowHandle()

			const pending = loader.load(1, handle)
			loader.reset()
			resolveFile(new File([''], 'song.mp3'))

			expect(await pending).toEqual({ status: 'superseded' })
			expect(loader.loading).toBe(false)
		})
	})
})
