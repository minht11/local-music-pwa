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

const getValueOrUndefined = (item?: string) => {
  let formatedItem = item ?? ''
  formatedItem = formatedItem.trim()

  return formatedItem !== '' ? formatedItem : undefined
}

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

    const artists =
      getValueOrUndefined(tags.common.artist)
        ?.split(/,|&/)
        .map((artist) => artist.trim()) || []

    const trackData: UnknownTrack = {
      name: tags.common.title || file.name,
      album: tags.common.album,
      artists,
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

  const tracksPromises = inputFiles.map(async (file) => {
    try {
      const metadata = await parseTrack(file)
      if (metadata) {
        parsedCount += 1

        sendMsg({ finished: false, parsedCount })

        return metadata
      }
    } catch (err) {
      // Do not throw if one file encounters an error.
      // eslint-disable-next-line no-console
      console.error(err)
    }
    return null
  })
  const unfilteredTracks = await Promise.all(tracksPromises)

  // Remove holes which may be left in case we werent able
  // to parse all tracks correctly.
  const tracks = unfilteredTracks.filter(
    (track) => track !== null,
  ) as UnknownTrack[]

  sendMsg({ finished: true, parsedCount, tracks })

  self.close()
}

self.addEventListener('message', (event: MessageEvent<FileWrapper[]>) => {
  parseAllTracks(event.data)
})
