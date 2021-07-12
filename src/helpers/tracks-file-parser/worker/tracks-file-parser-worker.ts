/// <reference lib='WebWorker' />

import { parse as parseMetadata } from 'id3-parser/src/index'
import { TrackParseMessage } from '../message-types'
import { getMP3Duration } from './get-mp3-duration'
import type { UnknownTrack, FileWrapper } from '../../../types/types'
import { getDominantHue } from './get-dominant-hue'

// published id3-parser package is cjs module which is quite
// a bit bigger and uses older syntax. To reduce size import
// Typescript source file at 'id3-parser/src/index'

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

  const fileBuffer = await new Response(file).arrayBuffer()
  const fileUint8 = new Uint8Array(fileBuffer)
  const tags = parseMetadata(fileUint8)

  if (!tags) {
    return null
  }

  let trackNo: number | undefined
  let trackOf: number | undefined
  if (tags.track && typeof tags.track === 'string') {
    const [no, of] = tags.track.split('/')
    trackNo = parseInt(no, 10)
    trackOf = parseInt(of, 10)
  }

  let imageBlob
  if (tags.image) {
    const { image } = tags
    const imageData = new Uint8ClampedArray(image.data)
    imageBlob = new Blob([imageData], { type: image.type })
  }

  const artists =
    getValueOrUndefined(tags.artist)
      ?.split(/,|&/)
      .map((artist) => artist.trim()) || []

  const trackData: UnknownTrack = {
    name: tags.title || file.name,
    album: getValueOrUndefined(tags.album),
    artists,
    genre: tags.genre ? tags.genre.split(' ') : [],
    trackNo,
    trackOf,
    year: getValueOrUndefined(tags.year),
    image: imageBlob,
    duration: getMP3Duration(fileUint8),
    fileWrapper,
    hue: imageBlob && (await getDominantHue(imageBlob)),
  }
  return trackData
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
