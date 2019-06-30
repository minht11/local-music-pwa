import { Reducer } from 'redux'
import { ActionTypes, State } from './types'

const initialState: State = {
  isOpen: false,
  items: [],
}

export const reducer: Reducer<State> = (state = initialState, action) => {
  const { type, payload } = action

  switch (type) {
  case ActionTypes.OPEN_MENU: {
    return { ...payload, isOpen: true, hey: true }
  }
  case ActionTypes.CLOSE_MENU: {
    return { ...state, isOpen: false }
  }
  default: {
    return state
  }
  }
}
