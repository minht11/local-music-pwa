import { JSX } from 'solid-js'

export interface MenuItem {
  name: string
  action: () => void
  disabled?: boolean
  selected?: boolean
}

export type MenuPosition = {
  top: number
  left: number
}

export interface MenuAlign {
  horizontal?: 'left' | 'right'
  vertical?: 'top' | 'bottom'
}

interface MenuAnchorOptions {
  anchor: true
  preferredAlign?: MenuAlign
}

interface MenuPositionOptions {
  anchor: false
  position: MenuPosition
}

interface MenuSize {
  width?: number
  height?: number
}

export type MenuOptions = (MenuAnchorOptions | MenuPositionOptions) & MenuSize

export interface MenuState {
  isOpen: boolean
  items: MenuItem[]
  component?: JSX.Element
}

export interface MenuContextProps {
  show(
    items: MenuState['items'] | { component: JSX.Element },
    targetElement: HTMLElement,
    options: MenuOptions,
  ): void
}
