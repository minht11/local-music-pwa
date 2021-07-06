import { createSignal, For, Switch } from 'solid-js'
import { MatchRoute, Redirect } from '@rturnq/solid-router'
import { Transition } from 'solid-transition-group'
import { Library, DEFAULT_LIBRARY_PATH } from '../library/library'
import { Settings } from '../settings/settings'
import { PLAYER_OR_QUEUE_PATH } from '../player/player'
import { NotFound } from '../not-found/not-found'
import { Search, SEARCH_MAIN_PATH } from '../search/search'
import { About } from '../about/about'
import { DetailsPage } from '../details-page/details-page'
import { DETAILS_PAGES_CONFIG } from '../details-page/details-pages-config'
import * as styles from './app.css'

export interface MainPagesProps {
  onEnter: (element: Element, done: () => void) => void
  onExit: (element: Element, done: () => void) => void
}

export const MainPages = (props: MainPagesProps) => {
  const [installEvent, setInstallEvent] =
    createSignal<BeforeInstallPromptEvent>()

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    setInstallEvent(e as BeforeInstallPromptEvent)
  })

  /* eslint-disable @typescript-eslint/ban-ts-comment */
  return (
    <Transition
      onEnter={props.onEnter}
      onExit={props.onExit}
      exitToClass={styles.pointerEventsNone}
      enterActiveClass={styles.pointerEventsNone}
    >
      <Switch fallback={NotFound}>
        <MatchRoute path={'/library'}>
          <Library installEvent={installEvent()} />
        </MatchRoute>
        <For each={DETAILS_PAGES_CONFIG}>
          {(config) => (
            <MatchRoute path={`${config.path}/:id`}>
              <DetailsPage {...config} />
            </MatchRoute>
          )}
        </For>
        <MatchRoute path='/settings' end>
          <Settings />
        </MatchRoute>
        {/** Render nothing if player overlay is open  */}
        {/** @ts-ignore */}
        <MatchRoute path={PLAYER_OR_QUEUE_PATH} end />
        <MatchRoute path={'/(|library)'} end>
          <Redirect noResolve href={DEFAULT_LIBRARY_PATH} />
        </MatchRoute>
        <MatchRoute path={SEARCH_MAIN_PATH}>
          <Search />
        </MatchRoute>
        <MatchRoute path={'/about'} end>
          <About />
        </MatchRoute>
      </Switch>
    </Transition>
  )
}
