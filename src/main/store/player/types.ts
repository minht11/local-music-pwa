import { Track } from '../../typings/interface'

export interface State {
  readonly isPlaying: boolean,
  readonly isMuted: boolean,
  readonly currentVolume: number,
  readonly tracks: Track[],
  readonly shuffledTracks: Track[],
  readonly activeTrackIndex: number,
  readonly repeat: number,
  readonly shuffle: boolean,
  readonly volume: number,
  readonly currentTime: number,
}

export const enum ActionTypes {
  PLAY = '@@player/PLAY',
  PAUSE = '@@player/PAUSE',
  PLAY_TRACK = '@@player/PLAY_TRACK',
  SET_TRACKS = '@@player/SET_TRACKS',
  TOGGLE_SHUFFLE = '@@player/TOGGLE_SHUFFLE',
  TOGGLE_REPEAT = '@@player/TOGGLE_REPEAT',
  SET_CURRENT_TIME = '@@player/SET_CURRENT_TIME',
  SET_VOLUME = '@@player/SET_VOLUME',
  ADD_TO_QUEUE_NEXT = '@@player/ADD_TO_QUEUE_NEXT',
  REMOVE_TRACK_FROM_QUEUE = '@@player/REMOVE_TRACK_FROM_QUEUE',
  TOGGLE_MUTE = '@@player/TOGGLE_MUTE',
}
