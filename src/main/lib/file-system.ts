import { TrackFileType } from '../typings/interface'

export const isNativeFileSystemSupported = 'FileSystemDirectoryHandle' in window

export const getFilesRefsRecursively = async (
  directory: FileSystemDirectoryHandle,
  supportedFileExtensions: string[],
) => {
  let files: FileSystemFileHandle[] = []
  for await (const entry of directory.getEntries()) {
    if (entry.isFile && supportedFileExtensions.includes(entry.name.split('.').pop() as string)) {
      files.push(entry as FileSystemFileHandle)
    } else if (entry.isDirectory) {
      files = [
        ...files,
        ...await getFilesRefsRecursively(
          entry as FileSystemDirectoryHandle,
          supportedFileExtensions,
        ),
      ]
    }
  }
  return files
}

export const getFilesFromLegacyInputEvent = (
  e: Event,
  supportedFileExtensions: string[],
): TrackFileType[] => {
  const { files } = e.target as HTMLInputElement
  // @ts-ignore
  e.target.files = undefined
  if (files) {
    const filesData = Array.from(files).filter(({ name }) => {
      const ext = name.split('.').pop()
      return supportedFileExtensions.includes(ext || '')
    }).map(file => ({ type: 'file', data: file })) as TrackFileType[]
    return filesData
  }
  return []
}

export const getFilesFromDirectory = async (
  supportedFileExtensions: string[],
): Promise<TrackFileType[]> => (
  new Promise(async (resolve) => {
    if (isNativeFileSystemSupported) {
      const directory = await chooseFileSystemEntries({
        type: 'openDirectory',
      }) as FileSystemDirectoryHandle
      if (!directory) {
        resolve([])
      }
      const filesRefs = await getFilesRefsRecursively(directory, supportedFileExtensions)
      const filesData = filesRefs.map(ref => ({ type: 'fileRef', data: ref })) as TrackFileType[]
      resolve(filesData)
    } else {
      const directoryElement = document.createElement('input')
      directoryElement.onchange = async (e: Event) => {
        console.log('change', e)
        resolve(getFilesFromLegacyInputEvent(e, supportedFileExtensions))
      }
      directoryElement.type = 'file'
      directoryElement.accept = supportedFileExtensions.map(format => `audio/${format}`).join(',')
      directoryElement.setAttribute('webkitdirectory', '')
      directoryElement.setAttribute('directory', '')
      console.log('click')
      directoryElement.click()
    }
  })
)
