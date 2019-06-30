import { createStore, applyMiddleware } from 'redux'
import thunk, { ThunkMiddleware } from 'redux-thunk'
import { installRouter } from 'pwa-helpers/router'
import {
  rootReducer,
  RootState,
  RootAction,
  cacheStorage,
  LOAD_ASYNC_INITIAL_DATA,
} from './store/index'
import { navigatePage } from './store/app/actions'

export {
  RootState,
}

export const store = createStore(
  rootReducer,
  {},
  applyMiddleware(
    thunk as ThunkMiddleware<RootState, RootAction>,
  ),
)

const loadState = async () => {
  const data = [{
    category: 'app',
    keys: ['theme', 'reducedMotion'],
  }, {
    category: 'player',
    keys: ['volume', 'shuffle', 'repeat', 'isMuted'],
  }, {
    category: 'library',
    keys: ['tracks', 'albums', 'artists', 'playlists'],
  }]

  const partialState: Record<string, Record<string, unknown>> = {}
  await Promise.all(
    data.map(async ({ category, keys }) => {
      partialState[category] = {}

      return Promise.all(keys.map(async (key) => {
        const keyValue = await cacheStorage.get(`${category}-${key}`)
        if (keyValue !== null && keyValue !== undefined) {
          partialState[category][key] = keyValue
        }
      }))
    }),
  )

  store.dispatch({ type: LOAD_ASYNC_INITIAL_DATA, payload: partialState })
  installRouter(location => store.dispatch(navigatePage(location)))
}
loadState()
