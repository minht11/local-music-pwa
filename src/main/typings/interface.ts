import './components'

export type TrackFileType = {
  type: 'file',
  data: File,
} | {
  type: 'fileRef',
  data: FileSystemFileHandle,
}

type ImageType = Blob | string | undefined

interface Base {
  name: string,
  id: number,
  duration: number,
}

export interface Track extends Base {
  album: string | undefined,
  artist: string | undefined,
  genre: string[],
  track: {
    no: number,
    of: number,
  } | undefined,
  year: string | undefined,
  image: ImageType,
  fileData: TrackFileType,
}

export interface Album extends Base {
  artist: string[],
  year: string | undefined,
  image: ImageType,
  tracksIds: number[],
}

export interface Artist extends Base {
  image: ImageType,
  tracksIds: number[],
}

export interface Playlist extends Base {
  tracksIds: number[],
  icon: string,
}

export type InfoViewData = Album | Artist | Playlist

declare global {
  interface CSS {
      registerProperty: Function,
      paintWorklet: {
          addModule: Function
      },
      animationWorklet: {
          addModule: Function
      }
  }
  interface FileSystemHandle {
    readonly isFile: boolean
    readonly isDirectory: boolean
    readonly name: string
  }
  interface FileSystemFileHandle extends FileSystemHandle {
    getFile(): Promise<File>
    createWriter(): Promise<FileSystemWriter>
  }
  interface FileSystemGetFileOptions {
    create: boolean
  }
  interface FileSystemGetDirectoryOptions {
    create: boolean
  }
  interface FileSystemRemoveOptions {
    recursive: boolean
  }
  interface FileSystemDirectoryHandle extends FileSystemHandle{
    getFile(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>
    getDirectory(
      name: string,
      options?: FileSystemGetDirectoryOptions
    ): Promise<FileSystemDirectoryHandle>

    getEntries(): AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>

    resolve(handle: FileSystemHandle): Promise<string[]>

    removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>
  }
  interface FileSystemWriter {
    write(position: number, data: BufferSource | Blob | string): Promise<void>
    asWritableStream(): WritableStream
    truncate(size: number): Promise<void>
    close(): Promise<void>
  }
  type ChooseFileSystemEntriesType = 'openFile' | 'saveFile' | 'openDirectory'
  interface ChooseFileSystemEntriesOptionsAccepts {
    description: string
    mimeTypes: string[]
    extensions: string[]
  }
  interface ChooseFileSystemEntriesOptions {
    type: ChooseFileSystemEntriesType
    multiple?: boolean,
    accepts?: ChooseFileSystemEntriesOptionsAccepts[]
    excludeAcceptAllOption?: boolean
  }
  function chooseFileSystemEntries(
      options?: ChooseFileSystemEntriesOptions
    ): Promise<FileSystemDirectoryHandle | FileSystemHandle[] | FileSystemHandle>
}
