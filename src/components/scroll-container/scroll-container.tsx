import { ScrollTargetContext } from '@minht11/solid-virtual-container'
import {
  createContext,
  createEffect,
  onCleanup,
  ParentComponent,
  useContext,
} from 'solid-js'
import { clx } from '../../utils'
import { useScaffoldContext } from '../scaffold/scaffold'
import * as styles from './scroll-container.css'

export const PlayerOverlayContext = createContext<() => boolean>(() => false)

export interface ScrollContainerProps {
  class?: string
  observeScrollState?: boolean
}

export const ScrollContainer: ParentComponent<ScrollContainerProps> = (
  props,
) => {
  const isPlayerOverlayVisible = useContext(PlayerOverlayContext)

  let targetEl!: HTMLDivElement
  let scrollObserverEl!: HTMLDivElement
  let initial = true

  const scaffoldContext = useScaffoldContext()

  if (scaffoldContext) {
    const [, setState] = scaffoldContext

    createEffect(() => {
      if (!props.observeScrollState) {
        return
      }

      const io = new IntersectionObserver(
        ([entry]) => {
          if (initial) {
            initial = false
            return
          }
          setState('isScolled', entry.intersectionRatio === 0)
        },
        { threshold: 0 },
      )

      io.observe(scrollObserverEl)
      onCleanup(() => io.unobserve(scrollObserverEl))
    })
  }

  return (
    <div
      class={clx(
        styles.scrollContainer,
        isPlayerOverlayVisible() && styles.playerOverlay,
        props.class,
      )}
      ref={targetEl}
    >
      <ScrollTargetContext.Provider value={{ scrollTarget: targetEl }}>
        <div ref={scrollObserverEl} class={styles.scrollObserver} />

        <div class={styles.contentSizer}>{props.children}</div>
      </ScrollTargetContext.Provider>
    </div>
  )
}
