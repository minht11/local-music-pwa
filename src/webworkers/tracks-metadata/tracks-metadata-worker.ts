import * as musicMetadata from 'music-metadata-browser'
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
  const {format, common: tags} = await musicMetadata.parseBlob(file, {duration: true})

  if (tags) {
    let imageBlob
    if (tags.picture && tags.picture.length > 0) {
      const image = tags.picture[0]
      const imageData = new Uint8ClampedArray(image.data)
      imageBlob = new Blob([imageData], { type: image.format })
    }
    const trackData: Track = {
      name: tags.title || file.name,
      album: tags.album,
      artist: tags.artist,
      genre: tags.genre ? tags.genre : [],
      track: tags.track,
      year: `${tags.year}`,
      image: imageBlob,
      duration: format.duration as any,
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
