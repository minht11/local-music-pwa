import { ParsedQuery } from 'query-string'
import { InfoViewData } from '../../typings/interface'

export interface PageQueryType {
  search?: string | undefined,
  sort_by?: string | undefined,
  [key: string]: keyof ParsedQuery | undefined,
}

export interface PageType {
  category: string,
  subCategory: string | undefined,
  query: PageQueryType,
}

export interface State {
  readonly page: PageType,
  readonly infoViewData: InfoViewData | undefined,
  readonly theme: 0 | 1 | 2,
  readonly reducedMotion: boolean,
}

export const enum ActionTypes {
  LOAD_ASYNC_INITIAL_DATA = '@@app/LOAD_ASYNC_INITIAL_DATA',
  SET_THEME = '@@app/SET_THEME',
  SET_REDUCED_MOTION = '@@app/SET_REDUCED_MOTION',
  UPDATE_PAGE = '@@app/UPDATE_PAGE',
  SET_INFO_VIEW_DATA = '@@app/SET_INFO_VIEW_DATA',
}
