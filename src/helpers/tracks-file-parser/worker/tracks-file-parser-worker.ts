/// <reference lib='WebWorker' />

import { Buffer } from 'buffer'
import { parseBuffer as parseMetadata } from 'music-metadata'
import { TrackParseMessage } from '../message-types'
import type { UnknownTrack, FileWrapper } from '../../../types/types'
import { extractColorFromImage } from './color-from-image'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.Buffer = Buffer

declare const self: DedicatedWorkerGlobalScope

// This limit is a bit arbitrary.
const FILE_SIZE_LIMIT_500MB = 5e8

const parseTrack = async (
  fileWrapper: FileWrapper,
): Promise<UnknownTrack | null> => {
  try {
    const file =
      fileWrapper.type === 'file'
        ? fileWrapper.file
        : await fileWrapper.file.getFile()

    // Ignore files bigger than 500mb because of
    // potential performance issues.
    if (file.size > FILE_SIZE_LIMIT_500MB) {
      return null
    }

    const fileBuffer = await new Response(file).arrayBuffer()
    const fileUint8 = new Uint8Array(fileBuffer)
    const tags = await parseMetadata(
      fileUint8,
      { mimeType: file.type, path: file.name, size: file.size },
      { duration: true },
    )

    const { common } = tags

    let imageBlob
    if (common.picture?.length) {
      const [image] = common.picture
      const imageData = new Uint8ClampedArray(image.data)
      imageBlob = new Blob([imageData], { type: image.type })
    }

    const trackData: UnknownTrack = {
      name: common.title || file.name,
      album: common.album,
      artists: common.artists || [],
      genre: common.genre || [],
      trackNo: common.track.no || 0,
      trackOf: common.track.of || 0,
      year: common.year?.toString(),
      image: imageBlob,
      duration: tags.format.duration || 0,
      fileWrapper,
      primaryColor: imageBlob && (await extractColorFromImage(imageBlob)),
    }
    return trackData
  } catch (err) {
    // Do not fail but still show an error.
    // eslint-disable-next-line no-console
    console.error(err)

    return null
  }
}

const sendMsg = (options: TrackParseMessage) => {
  self.postMessage(options)
}

const parseAllTracks = async (inputFiles: FileWrapper[]) => {
  let parsedCount = 0

  const tracks: UnknownTrack[] = []
  for await (const file of inputFiles) {
    const metadata = await parseTrack(file)

    if (metadata) {
      parsedCount += 1
      sendMsg({ finished: false, parsedCount })
      tracks.push(metadata)
    }
  }

  sendMsg({ finished: true, parsedCount, tracks })

  self.close()
}

self.addEventListener('message', (event: MessageEvent<FileWrapper[]>) => {
  parseAllTracks(event.data)
})
