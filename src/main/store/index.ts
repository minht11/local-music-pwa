import {
  Action,
  ActionCreator,
  Reducer,
  combineReducers,
} from 'redux'
import { ThunkAction } from 'redux-thunk'
import merge from 'deepmerge'
import isPlainObject from 'is-plain-object'
import * as App from './app/index'
import * as Library from './library/index'
import * as Player from './player/index'
import * as Toasts from './toasts/index'
import * as Menu from './menu/index'
import { CacheStorage } from '../lib/storage'

export const cacheStorage = new CacheStorage('app-data-storage')

export const LOAD_ASYNC_INITIAL_DATA = '@@root/LOAD_ASYNC_INITIAL_DATA'

export type RootActionTypes = App.ActionTypes | Library.ActionTypes
  | Player.ActionTypes | Toasts.ActionTypes | Menu.ActionTypes
  | typeof LOAD_ASYNC_INITIAL_DATA

export type RootAction = Action<RootActionTypes>

export interface RootState {
  player: Player.State,
  library: Library.State,
  app: App.State,
  toasts: Toasts.State,
  menu: Menu.State,
}

export type ThunkResult = ThunkAction<void, RootState, undefined, RootAction>

export type ThunkActionResult = ActionCreator<ThunkResult>

const reducer = combineReducers<RootState>({
  player: Player.reducer,
  library: Library.reducer,
  app: App.reducer,
  toasts: Toasts.reducer,
  menu: Menu.reducer,
})

export const rootReducer: Reducer<RootState> = (state, action) => {
  if (state && action.type === LOAD_ASYNC_INITIAL_DATA) {
    return merge(state, action.payload, {
      isMergeableObject: isPlainObject,
    })
  }

  return reducer(state, action)
}
