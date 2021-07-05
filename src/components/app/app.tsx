import { Component, createEffect, createSignal } from 'solid-js'
import { pathIntegration, Router, useRouter } from '@rturnq/solid-router'
import { createApp } from 'solid-utils'
import { setElementVar } from '@vanilla-extract/dynamic'
import { registerSW } from 'virtual:pwa-register'
import { LIBRARY_PATH } from '../library/library'
import {
  createIsPlayerOverlayOpenQuery,
  Player,
  PLAYER_CARD_ENTER_DURATION,
} from '../player/player'
import {
  animateViewEnterBackwards,
  animateViewEnterForwards,
  animateViewExitBackwards,
  animateViewExitForwards,
} from '../../helpers/animations/view-transition'
import { ToastProvider, useToast } from '../toasts/toasts'
import { MusicImagesProvider } from '../music-image/data-context'
import { MenuProvider } from '../menu/menu'
import { usePlayerStore, RootStoresProvider } from '../../stores/stores'
import { ModalsProvider } from '../modals/modals'
import { createMediaQuery } from '../../helpers/hooks/create-media-query'
import { vars } from '../../styles/styles.css'
import { prefersReducedMotion } from '../../utils'

import { MainPages } from './main-pages'
import * as styles from './app.css'

// const ErrorPage = () => (
//   <div className={stylesTemp.errorPage}>
//     Unknown error has occured please
//     <a
//       className={clx(buttonstylesTemp.btn, buttonstylesTemp.outlined, buttonstylesTemp.primary)}
//       href={'/'}
//     >
//       Reload
//     </a>
//   </div>
// )

// Direct copy from https://github.com/seek-oss/vanilla-extract/blob/cfb0c89b3f0a300eb58dbeb0ce3d9eb84a612844/packages/private/src/getVarName.ts#L1
function getVarName(variable: string) {
  const matches = variable.match(/^var\((.*)\)$/)

  if (matches) {
    return matches[1]
  }

  return variable
}

const App = () => {
  const router = useRouter()
  const isPlayerOpenQuery = createIsPlayerOverlayOpenQuery()

  const [playerState] = usePlayerStore()

  const isDark = createMediaQuery('(prefers-color-scheme: dark)')

  const DEFAULT_HUE = 20
  const [themeHue, setThemeHue] = createSignal(DEFAULT_HUE)

  createEffect(() => {
    const hue = playerState.activeTrack?.hue

    let tHue = DEFAULT_HUE
    if (hue) {
      const FULL_CIRCLE_DEG = 360
      tHue = FULL_CIRCLE_DEG * hue
    }

    setThemeHue(tHue)

    setElementVar(document.documentElement, styles.hueVar, `${tHue}deg`)
  })

  // Since <meta name="theme-color" content="color" /> value is static
  // it needs to be updated every time hue or theme changes.
  createEffect(() => {
    themeHue()
    isDark()

    const style = window.getComputedStyle(document.documentElement)

    const titleColor = style.getPropertyValue(getVarName(vars.colors.surface1))

    const titlebarElement = document.querySelector(
      'meta[name="theme-color"]',
    ) as HTMLMetaElement
    titlebarElement.content = titleColor
  })

  const toasts = useToast()

  const updateSW = registerSW({
    onNeedRefresh() {
      toasts.show({
        message: 'An app update is available',
        duration: false,
        controls: [
          {
            title: 'Reload',
            action: () => {
              updateSW(true)
            },
          },
        ],
      })
    },
  })

  const currentPath = () => router.location.path
  let previousPath = currentPath()

  createEffect(() => {
    const path = currentPath()
    // Deffer setting value only after onEnter has been called.
    requestAnimationFrame(() => {
      previousPath = path
    })
  })

  const { createMatcher } = router.utils
  const isLibraryPath = createMatcher(LIBRARY_PATH, { end: true })

  const isCurrentPathPlayerPath = () => isPlayerOpenQuery(currentPath())

  const onEnter = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    // Player route slides in from the bottom as an overlay so no other
    // animation is needed for other elements.
    if (isCurrentPathPlayerPath() || isPlayerOpenQuery(previousPath)) {
      done()
    } else if (isLibraryPath(currentPath())) {
      animateViewEnterBackwards(element).then(done)
    } else {
      animateViewEnterForwards(element).then(done)
    }
  }

  const onExit = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    // Keep rendering previous route while player route is animating.
    if (isCurrentPathPlayerPath()) {
      element
        .animate(null, {
          duration: PLAYER_CARD_ENTER_DURATION,
        })
        .finished.then(done)
    } else if (isLibraryPath(previousPath)) {
      animateViewExitForwards(element).then(done)
    } else {
      animateViewExitBackwards(element).then(done)
    }
  }

  return (
    <>
      <MainPages onEnter={onEnter} onExit={onExit} />
      <Player />
    </>
  )
}

// Root store depends on the ToastProvider
const AppLayout: Component = (props) => {
  const isPlayerOrQueuePath = createIsPlayerOverlayOpenQuery()
  return (
    <>
      <div className={styles.appContainer}>
        <ToastProvider
          className={
            isPlayerOrQueuePath()
              ? styles.toastPlayerOpenArea
              : styles.toastArea
          }
        >
          {props.children}
        </ToastProvider>
      </div>
    </>
  )
}

const onStoresLoad = () =>
  document.documentElement.removeAttribute('app-not-loaded')

createApp(App)
  .use(Router, { integration: pathIntegration(), children: {} })
  .use(MusicImagesProvider)
  .use(AppLayout)
  .use(RootStoresProvider, {
    onLoad: onStoresLoad,
  })
  .use(ModalsProvider)
  .use(MenuProvider)
  .mount('body')
