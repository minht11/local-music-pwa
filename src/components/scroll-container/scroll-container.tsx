import { ScrollTargetContext } from '@minht11/solid-virtual-container'
import {
  Component,
  createContext,
  createEffect,
  onCleanup,
  useContext,
} from 'solid-js'
import { clx } from '../../utils'
import { useScaffoldContext } from '../scaffold/scaffold'
import * as styles from './scroll-container.css'

export const PlayerOverlayContext = createContext<() => boolean>(() => false)

export interface ScrollContainerProps {
  className?: string
  observeScrollState?: boolean
}

export const ScrollContainer: Component<ScrollContainerProps> = (props) => {
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
      className={clx(
        styles.scrollContainer,
        isPlayerOverlayVisible() && styles.playerOverlay,
        props.className,
      )}
      ref={targetEl}
    >
      <ScrollTargetContext.Provider value={{ scrollTarget: targetEl }}>
        <div ref={scrollObserverEl} className={styles.scrollObserver} />

        <div className={styles.contentSizer}>{props.children}</div>
      </ScrollTargetContext.Provider>
    </div>
  )
}
