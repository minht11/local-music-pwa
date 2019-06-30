import { Action, AnyAction } from 'redux'
import { ActionTypes } from './types'
import { MenuItem, MenuPosition } from '../../components/x-menu'

export const openMenu = (position: MenuPosition, items: MenuItem[]): AnyAction => ({
  type: ActionTypes.OPEN_MENU,
  payload: {
    position,
    items,
  },
})

export const closeMenu = (): Action => ({
  type: ActionTypes.CLOSE_MENU,
})
