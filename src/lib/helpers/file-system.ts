import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
import { wait } from '$lib/helpers/utils/wait.ts'

export const isNativeFileSystemSupported: boolean = 'showDirectoryPicker' in globalThis

export type FileEntity = File | FileSystemFileHandle

export const getFileHandlesRecursively = async (
	directory: FileSystemDirectoryHandle,
	extensions: string[],
): Promise<FileSystemFileHandle[]> => {
	const files: FileSystemFileHandle[] = []

	for await (const handle of directory.values()) {
		if (handle.kind === 'file') {
			const isValidFile = extensions.some((ext) => handle.name.endsWith(`.${ext}`))

			if (isValidFile) {
				files.push(handle)
			}
		} else if (handle.kind === 'directory') {
			const additionalFiles = await getFileHandlesRecursively(handle, extensions)

			files.push(...additionalFiles)
		}
	}
	return files
}

export const getFilesFromLegacyInputEvent = (e: Event, extensions: string[]): FileEntity[] => {
	const { files } = e.target as HTMLInputElement
	if (!files) {
		return []
	}

	return Array.from(files).filter((file) =>
		extensions.some((ext) => file.name.endsWith(`.${ext}`)),
	)
}

export const getFilesFromDirectory = async (extensions: string[]): Promise<FileEntity[] | null> => {
	if (isNativeFileSystemSupported) {
		try {
			const directory = await showDirectoryPicker()
			const files = await getFileHandlesRecursively(directory, extensions)

			return files
		} catch {
			return null
		}
	}

	const directoryElement = document.createElement('input')
	directoryElement.type = 'file'

	// Mobile devices do not support directory selection,
	// so allow them to pick individual files instead.
	if (isMobile()) {
		directoryElement.accept = extensions.map((ext) => `.${ext}`).join(', ')

		directoryElement.multiple = true
	} else {
		directoryElement.setAttribute('webkitdirectory', '')
		directoryElement.setAttribute('directory', '')
	}

	return new Promise((resolve) => {
		directoryElement.addEventListener('change', (e) => {
			resolve(getFilesFromLegacyInputEvent(e, extensions))
		})
		// In some cases event listener might not be registered yet
		// because of event loop racing.
		wait(100).then(() => {
			directoryElement.click()
		})
	})
}
