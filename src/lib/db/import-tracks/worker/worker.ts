/// <reference lib='WebWorker' />

import { Buffer } from 'buffer'
import { parseBuffer as parseMetadata } from 'music-metadata/lib/core'
import { TrackParseMessage } from '../message-types'
import type { UnknownTrack } from '../../../types/types'
import { extractColorFromImage } from './color-from-image'
import { doesTrackAlreadyExist, importTrack } from '~/db/actions/import'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.Buffer = Buffer

declare const self: DedicatedWorkerGlobalScope

// This limit is a bit arbitrary.
const FILE_SIZE_LIMIT_500MB = 5e8

const parseTrack = async (
  fileOrHandle: File | FileSystemFileHandle,
): Promise<UnknownTrack | null> => {
  try {
    const file =
      fileOrHandle instanceof File ? fileOrHandle : await fileOrHandle.getFile()

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
      isFavorite: false,
      file: fileOrHandle,
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

const parseAllTracks = async (inputFiles: (File | FileSystemFileHandle)[]) => {
  let success = 0
  let current = 0
  const total = inputFiles.length

  const sendMsg = (finished: boolean) => {
    const message: TrackParseMessage = {
      finished,
      count: {
        success,
        current,
        total,
      },
    }

    self.postMessage(message)
  }

  for await (const file of inputFiles) {
    const metadata = await parseTrack(file)

    if (metadata && !(await doesTrackAlreadyExist(metadata))) {
      await importTrack(metadata)
      success += 1
    }

    current += 1

    sendMsg(false)
  }

  sendMsg(true)
  self.close()
}

self.addEventListener(
  'message',
  (event: MessageEvent<(File | FileSystemFileHandle)[]>) => {
    parseAllTracks(event.data)
  },
)
