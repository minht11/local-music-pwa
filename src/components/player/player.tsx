import { Component, Show } from 'solid-js'
import { useRouter } from '@rturnq/solid-router'
import { Transition } from 'solid-transition-group'
import { useAudioPlayer } from './audio/create-audio-player'
import { createMediaQuery } from '../../helpers/hooks/create-media-query'
import { clx, prefersReducedMotion } from '../../utils'
import { animateFade } from '../../helpers/animations/animations'
import { MiniPlayer } from './mini-player/mini-player'
import { FullPlayer } from './full-player/full-player'
import { container as mpContainerClassName } from './mini-player/mini-player.css'
import * as styles from './player.css'

const PLAYER_ROUTE = 'player'
const QUEUE_ROUTE = 'queue'
export const PLAYER_PATH = `/${PLAYER_ROUTE}`
export const PLAYER_QUEUE_PATH = `${PLAYER_PATH}/${QUEUE_ROUTE}`
export const PLAYER_OR_QUEUE_PATH = `/(${PLAYER_ROUTE}|${PLAYER_ROUTE}/${QUEUE_ROUTE})`

export const { PLAYER_CARD_ENTER_DURATION, PLAYER_CARD_EXIT_DURATION } = styles
const MP_FADE_DURATION = 75
const FP_FADE_DURATION = 125

export const createIsPlayerOverlayOpenQuery = () => {
  const router = useRouter()
  const isPlayerOrQueuePath = router.utils.createMatcher(PLAYER_OR_QUEUE_PATH, {
    end: true,
  })

  return (path = router.location.path) => !!isPlayerOrQueuePath(path)
}

export const Player: Component = () => {
  useAudioPlayer()

  const isCardOpen = createIsPlayerOverlayOpenQuery()

  const isCompact = createMediaQuery('(max-width: 700px), (max-height: 540px)')

  const onContentEnter = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    let totalDuration = 0
    let duration = 0
    if (element.classList.contains(mpContainerClassName)) {
      totalDuration = PLAYER_CARD_EXIT_DURATION
      duration = MP_FADE_DURATION
    } else {
      totalDuration = PLAYER_CARD_ENTER_DURATION
      duration = FP_FADE_DURATION
    }

    const delay = totalDuration - duration

    animateFade(element, false, {
      duration,
      delay,
      easing: 'linear',
      fill: 'backwards',
    }).finished.then(done)
  }

  const onContentExit = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    let totalDuration = 0
    let duration = 0
    if (element.classList.contains(mpContainerClassName)) {
      totalDuration = PLAYER_CARD_ENTER_DURATION
      duration = MP_FADE_DURATION
    } else {
      totalDuration = PLAYER_CARD_EXIT_DURATION
      duration = FP_FADE_DURATION
    }

    const endDelay = totalDuration - duration

    animateFade(element, true, {
      duration,
      delay: 0,
      endDelay,
      easing: 'linear',
      fill: 'both',
    }).finished.then(done)
  }

  return (
    <div className={styles.playerContainer}>
      <div className={clx(styles.card, isCardOpen() && styles.cardOpen)}>
        <Transition
          onEnter={onContentEnter}
          onExit={onContentExit}
          exitToClass={styles.pointerEventsNone}
          enterToClass={styles.pointerEventsNone}
        >
          <Show when={isCardOpen()} fallback={MiniPlayer}>
            <FullPlayer isCompact={isCompact()} />
          </Show>
        </Transition>
      </div>
    </div>
  )
}
