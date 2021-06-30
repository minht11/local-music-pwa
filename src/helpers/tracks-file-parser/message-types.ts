import type { UnknownTrack } from '../../types/types'

export interface TrackParseMessageNotFinished {
  finished: false
  parsedCount: number
}

export interface TrackParseMessageFinished {
  finished: true
  parsedCount: number
  tracks: UnknownTrack[]
}

export type TrackParseMessage =
  | TrackParseMessageNotFinished
  | TrackParseMessageFinished
