import { useIsRouting, useMatch, useRoutes } from 'solid-app-router'
import { createEffect, createMemo, createSignal, Suspense } from 'solid-js'
import { MiniPlayer } from '~/components/mini-player/mini-player'
import { createMediaQuery } from '~/helpers/hooks/create-media-query'
import { Toaster } from '~/components/toast/toast'
import { clx, IS_DEVICE_A_MOBILE } from '~/utils'
import { useSetupApp } from './use-setup-app'
import { ROUTES } from './routes'
import { PageTransition } from '~/components/page-transition/page-transition'
import { CONFIG as LIBRARY_CONFIG } from '../library/config'
import { CSSTransition } from '~/components/css-transition/css-transition'
import { PlayerOverlayContext } from '~/components/scroll-container/scroll-container'
import * as styles from './app.css'

const useIsRoute = (routes: readonly string[]) => {
  const matchers = routes.map((r) => useMatch(() => r))
  return createMemo(() => {
    const state = matchers.map((r) => r())
    return state.some(Boolean)
  })
}

export const App = () => {
  useSetupApp()

  const Routes = useRoutes(ROUTES)
  const isRouting = useIsRouting()

  const isPlayerRoute = useIsRoute(['/player', '/player/queue'])
  const isLibraryRoute = useIsRoute(
    LIBRARY_CONFIG.map((c) => `/library/${c.path}`),
  )
  const [wasLibaryPrevRoute, setWasLibaryPrevRoute] = createSignal(false)

  createEffect(() => {
    const isLibrary = isLibraryRoute()
    // Deffer setting values only after page changed.
    requestAnimationFrame(() => {
      setWasLibaryPrevRoute(isLibrary)
    })
  })

  const isSmallLayout = createMediaQuery('(max-width: 700px)')
  const isBottomNavBarVisible = () =>
    isLibraryRoute() && IS_DEVICE_A_MOBILE && isSmallLayout()

  return (
    <div class={styles.appContainer}>
      <div
        class={clx(
          styles.loadingIndicator,
          isRouting() && styles.loadingIndicatorEnabled,
        )}
      />

      <div class={styles.pages}>
        <PlayerOverlayContext.Provider value={() => !isPlayerRoute()}>
          <PageTransition forwards={wasLibaryPrevRoute()}>
            <Suspense>
              <Routes />
            </Suspense>
          </PageTransition>
        </PlayerOverlayContext.Provider>
      </div>
      <div
        class={clx(
          styles.bottomOverlay,
          isBottomNavBarVisible() && styles.bottomNavBarVisible,
        )}
      >
        <CSSTransition
          enter={styles.itemEnter}
          exit={styles.itemExit}
          move
          // initial={isPageLoaded}
        >
          <Toaster />
          {!isPlayerRoute() && <MiniPlayer />}
        </CSSTransition>
      </div>
    </div>
  )
}
