import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
import { wait } from '$lib/helpers/utils/wait.ts'

export const isFileSystemAccessSupported: boolean = 'showDirectoryPicker' in globalThis

export type FileEntity = File | FileSystemFileHandle

const supportedExtensions = ['aac', 'mp3', 'ogg', 'wav', 'flac', 'm4a', 'opus', 'webm']

export const getFileHandlesRecursively = async (
	directory: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle[]> => {
	const files: FileSystemFileHandle[] = []

	for await (const handle of directory.values()) {
		if (handle.kind === 'file') {
			const isValidFile = supportedExtensions.some((ext) => handle.name.endsWith(`.${ext}`))

			if (isValidFile) {
				files.push(handle)
			}
		} else if (handle.kind === 'directory') {
			const additionalFiles = await getFileHandlesRecursively(handle)

			files.push(...additionalFiles)
		}
	}
	return files
}

const getFilesFromLegacyInputEvent = (e: Event): File[] => {
	const { files } = e.target as HTMLInputElement
	if (!files) {
		return []
	}

	return Array.from(files).filter((file) =>
		supportedExtensions.some((ext) => file.name.endsWith(`.${ext}`)),
	)
}

export const getFilesFromLegacyDirectory = async (): Promise<File[]> => {
	const directoryElement = document.createElement('input')
	directoryElement.type = 'file'

	// Mobile devices do not support directory selection,
	// so allow them to pick individual files instead.
	if (isMobile()) {
		directoryElement.accept = supportedExtensions.map((ext) => `.${ext}`).join(', ')

		directoryElement.multiple = true
	} else {
		directoryElement.setAttribute('webkitdirectory', '')
		directoryElement.setAttribute('directory', '')
	}

	const { promise, resolve } = Promise.withResolvers<File[]>()

	directoryElement.addEventListener('change', (e) => {
		resolve(getFilesFromLegacyInputEvent(e))
	})

	directoryElement.addEventListener('error', () => {
		resolve([])
	})

	// In some cases event listener might not be registered yet
	// because of event loop racing.
	await wait(100)
	directoryElement.click()

	return promise
}
