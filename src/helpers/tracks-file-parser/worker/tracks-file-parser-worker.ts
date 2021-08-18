/// <reference lib='WebWorker' />

import { Buffer } from 'buffer'
import { parseBuffer as parseMetadata } from 'music-metadata'
import { TrackParseMessage } from '../message-types'
import type { UnknownTrack, FileWrapper } from '../../../types/types'
import { getDominantHue } from './get-dominant-hue'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.Buffer = Buffer

declare const self: DedicatedWorkerGlobalScope

// This limit is a bit arbitrary.
const FILE_SIZE_LIMIT_500MB = 5e8

const parseTrack = async (
  fileWrapper: FileWrapper,
): Promise<UnknownTrack | null> => {
  const file =
    fileWrapper.type === 'file'
      ? fileWrapper.file
      : await fileWrapper.file.getFile()

  // Ignore files bigger than 500mb because of
  // potential performance issues.
  if (file.size > FILE_SIZE_LIMIT_500MB) {
    return null
  }

  try {
    const fileBuffer = await new Response(file).arrayBuffer()
    const fileUint8 = new Uint8Array(fileBuffer)
    const tags = await parseMetadata(
      fileUint8,
      { mimeType: file.type, path: file.name, size: file.size },
      { duration: true },
    )

    let imageBlob
    if (tags.common.picture?.length) {
      const [image] = tags.common.picture
      const imageData = new Uint8ClampedArray(image.data)
      imageBlob = new Blob([imageData], { type: image.type })
    }

    const trackData: UnknownTrack = {
      name: tags.common.title || file.name,
      album: tags.common.album,
      artists: tags.common.artists || [],
      genre: tags.common.genre || [],
      trackNo: tags.common.track.no || 0,
      trackOf: tags.common.track.of || 0,
      year: tags.common.year?.toString(),
      image: imageBlob,
      duration: tags.format.duration || 0,
      fileWrapper,
      hue: imageBlob && (await getDominantHue(imageBlob)),
    }
    return trackData
  } catch (_error) {
    return null
  }
}

const sendMsg = (options: TrackParseMessage) => {
  self.postMessage(options)
}

const parseAllTracks = async (inputFiles: FileWrapper[]) => {
  let parsedCount = 0

  const tracks: UnknownTrack[] = []
  for (const file of inputFiles) {
    try {
      const metadata = await parseTrack(file)
      if (!metadata) continue

      sendMsg({ finished: false, parsedCount: ++parsedCount })
      tracks.push(metadata)
    } catch (err) {
      // Do not throw if one file encounters an error.
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  sendMsg({ finished: true, parsedCount, tracks })

  self.close()
}

self.addEventListener('message', (event: MessageEvent<FileWrapper[]>) => {
  parseAllTracks(event.data)
})
