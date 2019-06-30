import { MenuItem, MenuPosition } from '../../components/x-menu'

export interface State {
  readonly isOpen: boolean,
  readonly items: MenuItem[],
  readonly position?: MenuPosition,
}

export const enum ActionTypes {
  OPEN_MENU = '@@menu/OPEN_MENU',
  CLOSE_MENU = '@@menu/CLOSE_MENU',
}
