import type {
  VirtualItemProps,
  VirtualListProps,
} from './virtual-content/types'
import { VirtualContainer } from './virtual-content/virtual-container'

export { ScrollTargetContext } from './virtual-content/scroll-target-context'

export type { VirtualItemProps, VirtualListProps }

export function VirtualList<T>(props: VirtualListProps<T>) {
  return <VirtualContainer {...props}>{props.children}</VirtualContainer>
}

export function VirtualGridList<T>(props: VirtualListProps<T>) {
  return (
    <VirtualContainer
      {...props}
      crossAxisCount={(measurements) =>
        Math.floor(measurements.container.cross / measurements.itemSize.cross)
      }
    >
      {props.children}
    </VirtualContainer>
  )
}
