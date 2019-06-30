import { Reducer } from 'redux'
import { createSelector } from 'reselect'
import { cacheStorage } from '../index'
import { ActionTypes, State } from './types'
import { shuffleTracks } from '../../utils/tracks-utils'
import { Track } from '../../typings/interface'

const initialState: State = {
  isPlaying: false,
  isMuted: false,
  currentVolume: 1,
  tracks: [],
  shuffledTracks: [],
  activeTrackIndex: -1,
  repeat: 0,
  shuffle: false,
  volume: 1,
  currentTime: 0,
}

export const reducer: Reducer<State> = (state = initialState, action): State => {
  const { type, payload } = action

  switch (type) {
  case ActionTypes.PLAY: {
    return { ...state, isPlaying: true }
  }
  case ActionTypes.PAUSE: {
    return { ...state, isPlaying: false }
  }
  case ActionTypes.SET_TRACKS: {
    return {
      ...state,
      tracks: [...payload],
      isPlaying: false,
      activeTrackIndex: -1,
    }
  }
  case ActionTypes.PLAY_TRACK: {
    const { tracks, activeTrackIndex } = payload
    const newState = {
      ...state,
      isPlaying: true,
      currentTime: 0,
      activeTrackIndex,
    }
    if (tracks) {
      newState.tracks = [...tracks]
      if (state.shuffle) {
        newState.shuffledTracks = shuffleTracks(tracks, activeTrackIndex)
        newState.activeTrackIndex = 0
      }
    }
    return newState
  }
  case ActionTypes.ADD_TO_QUEUE_NEXT: {
    // TODO. Need to set for shuffled tracks too.
    let removedTrackIndex = -1
    const tracks = state.tracks.filter((track, index) => {
      if (track === payload) {
        removedTrackIndex = index
        return false
      }
      return true
    })
    let { activeTrackIndex } = state
    // In order for active track not to change it's position
    // needs to be adjusted.
    if (removedTrackIndex !== -1) {
      activeTrackIndex -= activeTrackIndex > removedTrackIndex ? 1 : 0
    }
    tracks.splice(activeTrackIndex + 1, 0, payload)
    if (tracks.length === 1) {
      return {
        ...state,
        tracks,
        activeTrackIndex: 0,
        isPlaying: true,
      }
    }
    return {
      ...state,
      tracks,
      activeTrackIndex,
    }
  }
  case ActionTypes.REMOVE_TRACK_FROM_QUEUE: {
    let { activeTrackIndex } = state
    const removedTrackIndex = -1
    const tracks = state.tracks.filter((_, index) => {
      if (index === activeTrackIndex) {
        activeTrackIndex = index
        return false
      }
      return true
    })
    if (removedTrackIndex !== -1) {
      activeTrackIndex -= activeTrackIndex > removedTrackIndex ? 1 : 0
    }
    return {
      ...state,
      tracks,
      activeTrackIndex,
    }
  }
  case ActionTypes.TOGGLE_REPEAT: {
    const repeat = state.repeat === 2 ? 0 : state.repeat + 1
    cacheStorage.set('player-repeat', repeat)
    return { ...state, repeat }
  }
  case ActionTypes.SET_CURRENT_TIME: {
    return { ...state, currentTime: payload }
  }
  case ActionTypes.SET_VOLUME: {
    cacheStorage.set('player-volume', payload)
    return { ...state, volume: payload }
  }
  case ActionTypes.TOGGLE_MUTE: {
    const isMuted = !state.isMuted
    cacheStorage.set('player-isMuted', isMuted)
    return { ...state, isMuted }
  }
  case ActionTypes.TOGGLE_SHUFFLE: {
    const { shuffle: oldShuffle, tracks, activeTrackIndex: oldTrackIndex } = state
    const shuffle = !oldShuffle
    let shuffledTracks: Track[] = []
    let activeTrackIndex
    if (shuffle) {
      const activeTrack = tracks[oldTrackIndex]
      shuffledTracks = shuffleTracks(tracks, oldTrackIndex)
      activeTrackIndex = shuffledTracks.findIndex(track => track === activeTrack)
    } else {
      const activeTrack = state.shuffledTracks[oldTrackIndex]
      activeTrackIndex = tracks.findIndex(track => track === activeTrack)
    }
    cacheStorage.set('player-shuffle', shuffle)
    return {
      ...state,
      shuffle,
      shuffledTracks,
      activeTrackIndex,
    }
  }
  default: {
    return state
  }
  }
}

export const activeTrackIndexSelector = (state: State) => state.activeTrackIndex
export const tracksSelector = (state: State) => state.tracks
export const shuffledTracksSelector = (state: State) => state.shuffledTracks
export const shuffleStateSelector = (state: State) => state.shuffle

export const tracksInQueueSelector = createSelector(
  [shuffleStateSelector, shuffledTracksSelector, tracksSelector],
  (shuffle, shuffledTracks, tracks) => (shuffle ? shuffledTracks : tracks),
)

export const activeTrackSelector = createSelector(
  [tracksInQueueSelector, activeTrackIndexSelector],
  (tracks, index) => tracks[index],
)
