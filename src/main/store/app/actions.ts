import queryString, { ParsedQuery } from 'query-string'
import { AnyAction } from 'redux'
import { ActionTypes, PageType, PageQueryType } from './types'
import { Album, Artist, Playlist } from '../../typings/interface'
import { search, sort } from '../library/actions'
import { ThunkActionResult } from '../index'

export const setReducedMotion = (enable: boolean): AnyAction => ({
  type: ActionTypes.SET_REDUCED_MOTION,
  payload: enable,
})

export const setTheme = (themeIndex: 0 | 1 | 2): AnyAction => ({
  type: ActionTypes.SET_THEME,
  payload: themeIndex,
})

export const loadPage: ThunkActionResult = (options: PageType) => (dispatch, getState) => {
  const { category: initialCategory, subCategory, query } = options
  let category = initialCategory

  switch (initialCategory) {
  case 'settings':
    import('../../components/settings-view')
    break
  case 'library': {
    const tabs = [{
      type: 'songs',
      sortBy: ['title', 'artist', 'album', 'year', 'duration'],
    }, {
      type: 'albums',
      sortBy: ['title', 'artist', 'year', 'duration'],
    }, {
      type: 'artists',
      sortBy: ['title', 'duration'],
    }, {
      type: 'playlists',
      sortBy: ['title', 'duration'],
    }]

    const tab = tabs.find(item => item.type === subCategory)
    if (!tab) {
      category = 'view404'
      break
    }
    const { search: newSearchTerm, sort_by: sortBy } = query
    if (newSearchTerm) {
      dispatch(search(`${newSearchTerm}`.trim()))
    }
    if (sortBy && tab.sortBy.includes(sortBy)) {
      dispatch(sort(subCategory as string, sortBy))
    }
    break
  }
  case 'album':
  case 'artist':
  case 'playlist': {
    if (subCategory) {
      const state = getState()
      let list: Album[] | Artist[] | Playlist[]
      if (initialCategory === 'album') {
        list = state.library.albums.list
      } else if (initialCategory === 'artist') {
        list = state.library.artists.list
      } else {
        list = state.library.playlists.list
      }
      const subCategoryNmbr = parseInt(subCategory, 10)
      // @ts-ignore
      const item = list.find(({ id }) => id === subCategoryNmbr)
      if (item) {
        dispatch({
          type: ActionTypes.SET_INFO_VIEW_DATA,
          payload: item,
        })
        break
      }
    }
    category = 'view404'
    break
  }
  case 'queue':
    break
  default:
    category = 'view404'
    // import('../components/my-view404.js')
  }
  dispatch({
    type: ActionTypes.UPDATE_PAGE,
    payload: {
      category,
      subCategory,
      query,
    },
  })
}

export const navigate = (options: { path: string, query?: ParsedQuery }) => {
  const { path, query: queryObj } = options
  const query = queryObj ? queryString.stringify(queryObj) : ''
  location.pathname = path
  location.search = query
}

export const navigatePage: ThunkActionResult = (location: Location) => (dispatch) => {
  const path = decodeURIComponent(location.pathname)
  const query = queryString.parse(location.search) as PageQueryType

  const page = path === '/' ? 'library/songs' : path.slice(1)
  const categories = page.split('/')

  let category = page
  let subCategory: string | undefined
  if (categories.length > 1) {
    [category, subCategory] = categories
  }

  dispatch(loadPage({ category, subCategory, query }))
}
