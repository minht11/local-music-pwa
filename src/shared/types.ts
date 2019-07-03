export type TrackFileType = {
  type: 'file',
  data: File,
} | {
  type: 'fileRef',
  data: FileSystemFileHandle,
}

export type ImageType = Blob | string | undefined

export interface Base {
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
