import { Component, createSignal, onCleanup, Show, Switch } from 'solid-js'
import { MatchRoute, Route, useRouter } from '@rturnq/solid-router'
import { Transition } from 'solid-transition-group'
import { setElementVar } from '@vanilla-extract/dynamic'
import { useAudioPlayer } from './audio/create-audio-player'
import { createMediaQuery } from '../../helpers/hooks/create-media-query'
import { prefersReducedMotion, toggleReverseArray } from '../../utils'
import { MiniPlayer } from './mini-player/mini-player'
import { FullPlayer } from './full-player/full-player'
import { Queue } from './queue/queue'
import {
  animateViewEnterBackwards,
  animateViewEnterForwards,
  animateViewExitBackwards,
  animateViewExitForwards,
} from '../../helpers/animations/view-transition'
import * as styles from './player.css'
import { animateFade } from '../../helpers/animations/animations'

const cancelAnimations = (animations: Animation[]) =>
  animations.forEach((ani) => ani.cancel())

const PLAYER_ROUTE = 'player'
const QUEUE_ROUTE = 'queue'
export const PLAYER_PATH = `/${PLAYER_ROUTE}`
export const PLAYER_QUEUE_PATH = `${PLAYER_PATH}/${QUEUE_ROUTE}`
export const PLAYER_OR_QUEUE_PATH = `/(${PLAYER_ROUTE}|${PLAYER_ROUTE}/${QUEUE_ROUTE})`

export const PLAYER_CARD_ENTER_DURATION = 300
export const PLAYER_CARD_EXIT_DURATION = 250

export const createIsPlayerOverlayOpenQuery = () => {
  const router = useRouter()
  const isPlayerOrQueuePath = router.utils.createMatcher(PLAYER_OR_QUEUE_PATH, {
    end: true,
  })

  return (path = router.location.path) => !!isPlayerOrQueuePath(path)
}

export const Player: Component = () => {
  useAudioPlayer()

  const isPlayerOrQueuePath = createIsPlayerOverlayOpenQuery()

  const isCompact = createMediaQuery('(max-width: 700px), (max-height: 540px)')

  const [shouldRenderMiniPlayer, setShouldRenderMiniPlayer] = createSignal(
    !isPlayerOrQueuePath(),
  )

  let playerContainerEl!: HTMLDivElement
  let cardEl!: HTMLDivElement

  let mpContainerEl!: HTMLDivElement
  // Element wrapping full player and queue
  let fpContentContainerEl!: HTMLDivElement

  // Only used as a check during queue animation.
  let fpContainerEl!: HTMLDivElement
  let queuePaneEl!: HTMLDivElement

  const animateCard = (isFpExiting?: boolean) => {
    const transformFrames = [
      `translateY(calc(100% - ${styles.miniPlayerHeightVar}))`,
      'none',
    ]

    return cardEl.animate(
      {
        transform: toggleReverseArray(transformFrames, isFpExiting),
      },
      {
        duration: isFpExiting
          ? PLAYER_CARD_EXIT_DURATION
          : PLAYER_CARD_ENTER_DURATION,
        easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
    ).finished
  }

  const animateFadePlayerContent = async (isFpExiting = false) => {
    const MP_FADE_DURATION = 75
    const FP_FADE_DURATION = 125

    const mpAni = animateFade(mpContainerEl, !isFpExiting, {
      duration: MP_FADE_DURATION,
      delay: isFpExiting ? PLAYER_CARD_EXIT_DURATION - MP_FADE_DURATION : 0,
      easing: 'linear',
      fill: 'both',
    })

    const fpAni = animateFade(fpContentContainerEl, isFpExiting, {
      duration: FP_FADE_DURATION,
      delay: isFpExiting ? 0 : PLAYER_CARD_ENTER_DURATION - FP_FADE_DURATION,
      easing: 'linear',
      fill: 'both',
    })

    return Promise.all([mpAni.finished, fpAni.finished]).then(() => [
      mpAni,
      fpAni,
    ])
  }

  const onFPEnter = (_: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      setShouldRenderMiniPlayer(false)
      done()
      return
    }

    animateCard()
    animateFadePlayerContent().then((animations) => {
      setShouldRenderMiniPlayer(false)
      // Cancel opacity animations after they are done because
      // 'fill: both' causes unrelated layers to repaint while interacting
      // with player controls.
      done()
      cancelAnimations(animations)
    })
  }

  const onFPExit = (_: Element, done: () => void) => {
    setShouldRenderMiniPlayer(true)

    if (prefersReducedMotion()) {
      done()
      return
    }

    // Let mini player DOM render, before animating.
    queueMicrotask(() => {
      const contentAnimations = animateFadePlayerContent(true)
      animateCard(true).then(async () => {
        cancelAnimations(await contentAnimations)
        done()
      })
    })
  }

  const onQueueEnter = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    if (fpContainerEl === element) {
      animateViewEnterBackwards(fpContainerEl).then(done)
      return
    }
    animateViewEnterForwards(queuePaneEl).then(done)
  }

  const onQueueExit = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    if (fpContainerEl === element) {
      animateViewExitForwards(fpContainerEl).then(done)
      return
    }
    animateViewExitBackwards(queuePaneEl).then(done)
  }

  const ro = new ResizeObserver(([entry]) => {
    setElementVar(
      cardEl,
      styles.windowHeightVar,
      `${entry.contentRect.height}px`,
    )
  })
  ro.observe(document.body)
  onCleanup(() => {
    ro.disconnect()
  })

  const FullPlayerWrapper = () => (
    <FullPlayer isCompact={isCompact()} ref={fpContainerEl} />
  )

  return (
    <div className={styles.playerContainer} ref={playerContainerEl}>
      <div className={styles.card} ref={cardEl}>
        <Show when={shouldRenderMiniPlayer()}>
          <MiniPlayer ref={mpContainerEl} />
        </Show>
        <Transition onEnter={onFPEnter} onExit={onFPExit}>
          <Route path={PLAYER_OR_QUEUE_PATH} end={!isCompact()}>
            <div className={styles.fpContainer} ref={fpContentContainerEl}>
              <Show
                when={!isCompact()}
                fallback={
                  <Transition onEnter={onQueueEnter} onExit={onQueueExit}>
                    <Switch>
                      <MatchRoute path={PLAYER_PATH} end>
                        <FullPlayerWrapper />
                      </MatchRoute>
                      <MatchRoute path={PLAYER_QUEUE_PATH} end>
                        <Queue ref={queuePaneEl} isCompact={isCompact()} />
                      </MatchRoute>
                    </Switch>
                  </Transition>
                }
              >
                <FullPlayerWrapper />
                <Queue />
              </Show>
            </div>
          </Route>
        </Transition>
      </div>
    </div>
  )
}
