import { FileWrapper, UnknownTrack } from '../../types/types'
import { TrackParseMessage } from './message-types'

export type TrackParsedFn = (totalParsedCount: number) => void

export const tracksParser = async (
  files: FileWrapper[],
  trackParsed: TrackParsedFn,
): Promise<UnknownTrack[]> => {
  const TrackWorkerModule = await import(
    './worker/tracks-file-parser-worker?worker&inline'
  )
  const TrackWorker = TrackWorkerModule.default

  return new Promise((resolve, reject) => {
    const worker = new TrackWorker()

    worker.addEventListener('error', reject)
    worker.addEventListener(
      'message',
      ({ data }: MessageEvent<TrackParseMessage>) => {
        if (data.finished) {
          resolve(data.tracks)
        } else {
          trackParsed(data.parsedCount)
        }
      },
    )

    worker.postMessage(files)
  })
}
