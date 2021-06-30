import { JSX } from 'solid-js'

export type Direction = 'vertical' | 'horizontal'

export interface VirtualItemSizeStatic {
  width?: number
  height?: number
}

export type VirtualItemSizeDynamic = (
  crossAxisContentSize: number,
  isHorizontal: boolean,
) => VirtualItemSizeStatic

export type VirtualItemSize = VirtualItemSizeStatic | VirtualItemSizeDynamic

export interface VirtualItemProps<T> {
  items: readonly T[]
  item: T
  index: number
  tabIndex: number
  style: Record<string, string | number | undefined>
}

export interface VirtualListProps<T> {
  itemSize: VirtualItemSize
  items: readonly T[]
  scrollTarget?: HTMLElement
  direction?: Direction
  children: (props: VirtualItemProps<T>) => JSX.Element
}
