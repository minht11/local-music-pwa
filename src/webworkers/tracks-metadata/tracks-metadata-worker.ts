import { parse as parseMetadata } from 'id3-parser'
import { getMP3Duration } from './get-mp3-duration'
import { Track, TrackFileType } from '../../shared/types'

const getArrayBufferFromFile = (file: File): Promise<ArrayBuffer> => (
  new Promise(async (resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => {
      reader.abort()
      reject(new DOMException('Problem parsing input file.'))
    }

    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  })
)

const getTrackMetadata = async (fileData: TrackFileType): Promise<Track | void> => {
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
      duration: getMP3Duration(buff),
      id: new Date().getTime(),
      fileData,
    }
    return trackData
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const files: TrackFileType[] = event.data

  const tracks: Track[] = []
  const tasks = files.map(async (file): Promise<Track | void> => {
    try {
      const metadata = await getTrackMetadata(file)
      if (metadata) {
        tracks.push(metadata)
        // @ts-ignore
        self.postMessage({
          finished: false,
        })
      }
    } catch (err) {
      // eslint-disable-next-line
      console.log(err)
    }
  })
  await Promise.all(tasks)
  self.close()

  // @ts-ignore
  self.postMessage({
    finished: true,
    tracks,
  })
})
