import { Reducer } from 'redux'
import { ActionTypes, State } from './types'

const initialState: State = []

export const reducer: Reducer<State> = (state = initialState, action) => {
  const { type, payload } = action

  switch (type) {
  case ActionTypes.ADD_TOAST: {
    const toasts = state.filter(toast => toast.id !== payload.id)
    return [...toasts, payload]
  }
  case ActionTypes.REMOVE_TOAST: {
    return state.filter(toast => toast.id !== payload)
  }
  default: {
    return state
  }
  }
}
