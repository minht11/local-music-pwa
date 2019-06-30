import { Action, AnyAction } from 'redux'
import { ThunkActionResult } from '../index'
import { Track } from '../../typings/interface'
import { ActionTypes } from './types'

export const setTracks = (tracks: Track[]): AnyAction => ({
  type: ActionTypes.SET_TRACKS,
  payload: tracks,
})

export const removeTracks = () => setTracks([])

export const removeTrackFromQueue = (index: number): AnyAction => ({
  type: ActionTypes.REMOVE_TRACK_FROM_QUEUE,
  payload: index,
})

export const addToQueueNext = (track: Track): AnyAction => ({
  type: ActionTypes.ADD_TO_QUEUE_NEXT,
  payload: track,
})

export const toggleMute = (): Action => ({
  type: ActionTypes.TOGGLE_MUTE,
})

export const play = (): Action => ({ type: ActionTypes.PLAY })

export const pause = (): Action => ({ type: ActionTypes.PAUSE })

export const playPause: ThunkActionResult = () => (dispatch, getState) => {
  const state = getState()
  dispatch(state.player.isPlaying ? pause() : play())
}

export const setCurrentTime = (time: number): AnyAction => ({
  type: ActionTypes.SET_CURRENT_TIME,
  payload: time,
})

export const setVolume = (volume: number): AnyAction => ({
  type: ActionTypes.SET_VOLUME,
  payload: volume,
})

export const playTrack = (index: number, tracks?: Track[]) => {
  if (tracks) {
    return {
      type: ActionTypes.PLAY_TRACK,
      payload: {
        tracks,
        activeTrackIndex: index,
      },
    }
  }
  return {
    type: ActionTypes.PLAY_TRACK,
    payload: {
      activeTrackIndex: index,
    },
  }
}

export const playNextTrack: ThunkActionResult = (unlessTheLastTrack?: boolean) => (
  (dispatch, getState) => {
    const { player } = getState()
    const { tracks, activeTrackIndex } = player
    const isTheLastTrack = tracks.length === activeTrackIndex + 1
    if (isTheLastTrack && unlessTheLastTrack) {
      dispatch(pause())
    } else {
      const newIndex = isTheLastTrack ? 0 : activeTrackIndex + 1
      dispatch(playTrack(newIndex))
    }
  })

export const playPreveousTrack: ThunkActionResult = () => (dispatch, getState) => {
  const { player } = getState()
  const { tracks, activeTrackIndex, currentTime } = player
  let newIndex = activeTrackIndex
  if (currentTime < 4) {
    newIndex = activeTrackIndex === 0 ? tracks.length - 1 : activeTrackIndex - 1
  }
  dispatch(playTrack(newIndex))
}

export const toggleRepeatState = (): Action => ({
  type: ActionTypes.TOGGLE_REPEAT,
})

export const toggleShuffle = (): Action => ({
  type: ActionTypes.TOGGLE_SHUFFLE,
})
