import { Reducer } from 'redux'
import { cacheStorage } from '../index'
import { ActionTypes, State } from './types'

const initialState: State = {
  page: {
    category: '',
    subCategory: '',
    query: {},
  },
  infoViewData: undefined,
  theme: 0,
  reducedMotion: false,
}

export const reducer: Reducer<State> = (state = initialState, action) => {
  const { type, payload } = action

  switch (type) {
  case ActionTypes.UPDATE_PAGE: {
    return { ...state, page: payload }
  }
  case ActionTypes.SET_INFO_VIEW_DATA: {
    return { ...state, infoViewData: payload }
  }
  case ActionTypes.SET_THEME: {
    cacheStorage.set('app-theme', payload)
    return { ...state, theme: payload }
  }
  case ActionTypes.SET_REDUCED_MOTION: {
    cacheStorage.set('app-reducedMotion', payload)
    return { ...state, reducedMotion: payload }
  }
  default: {
    return state
  }
  }
}
