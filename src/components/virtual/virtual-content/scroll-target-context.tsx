import { createContext } from 'solid-js'

export interface ScrollTargetContextProps {
  scrollTarget?: HTMLElement
}

export const ScrollTargetContext = createContext<ScrollTargetContextProps>()
