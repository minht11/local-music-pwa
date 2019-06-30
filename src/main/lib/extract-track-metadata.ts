import { parse as parseMetadata } from 'id3-parser'
import { getArrayBufferFromFile } from './file-system'
import { Track, TrackFileType } from '../typings/interface'

export const SUPPORTED_FILE_FORMATS: string[] = ['mp3', 'waw', 'ogg']

export const getAudioDuration = (file: File): Promise<number> => {
  const audio = new Audio()
  const url = URL.createObjectURL(file)

  return new Promise((resolve) => {
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      // eslint-disable-next-line
      console.warn('Failed to get audio duration')
      resolve(0)
    })

    audio.preload = 'metadata'
    audio.src = url
  })
}

// TODO. Currently it is not possible to pass NFS references to the worker or save them to IDB.
// https://bugs.chromium.org/p/chromium/issues/detail?id=955193
// This should be possible after chrome 78 lands.
// Then move most of this logic to the worker.
export const getTrackMetadata = async (fileData: TrackFileType): Promise<Track | void> => {
  const file = fileData.type === 'file' ? fileData.data : await fileData.data.getFile()
  const buff = await getArrayBufferFromFile(file)
  const tags = parseMetadata(new Uint8Array(buff))

  if (tags) {
    let trackPosition
    if (tags.track) {
      if (typeof tags.track === 'number') {
        trackPosition = undefined
      } else {
        const [no, of] = tags.track.split('/')
        trackPosition = { no: parseInt(no, 10), of: parseInt(of, 10) }
      }
    }
    let imageBlob
    if (tags.image) {
      const { image } = tags
      const imageData = new Uint8ClampedArray(image.data)
      imageBlob = new Blob([imageData], { type: image.type })
    }
    const trackData: Track = {
      name: tags.title || file.name,
      album: tags.album,
      artist: tags.artist,
      genre: tags.genre ? tags.genre.split(' ') : [],
      track: trackPosition,
      year: tags.year,
      image: imageBlob,
      duration: await getAudioDuration(file),
      id: new Date().getTime(),
      fileData,
    }
    return trackData
  }
}
