import { Component, createMemo, For, Show, Switch } from 'solid-js'
import { MatchRoute, useRoute, useRouter } from '@rturnq/solid-router'
import { Transition } from 'solid-transition-group'
import { Icon, IconType } from '../icon/icon'
import { Toolbar } from '../toolbar/toolbar'
import { IconButton } from '../icon-button/icon-button'
import { useMenu } from '../menu/menu'
import { useEntitiesStore } from '../../stores/stores'
import { MessageBanner } from '../message-banner/message-banner'
import { animateFade } from '../../helpers/animations/animations'
import { clx, prefersReducedMotion } from '../../utils'
import { LibraryPageConfig, LIBRARY_PAGES_CONFIG } from './library-pages-config'
import { LibraryPage } from './library-page'
import {
  EASING_INCOMING_80,
  EASING_OUTGOING_40,
} from '../../helpers/animations/view-transition'
import * as styles from './library.css'

export const LIBRARY_PATH = '/library'
export const DEFAULT_LIBRARY_PATH = `${LIBRARY_PATH}/${LIBRARY_PAGES_CONFIG[0].path}`

interface LibraryProps {
  installEvent?: BeforeInstallPromptEvent
}

const Header = (props: LibraryProps) => {
  const router = useRouter()
  const menu = useMenu()

  const onMenuClickHandler = (e: MouseEvent) => {
    menu.show(
      [
        {
          name: 'Settings',
          action: () => router.push('/settings'),
        },
        {
          name: 'About',
          action: () => router.push('/about'),
        },
      ],
      e.target as HTMLElement,
      {
        anchor: true,
        preferredAlign: {
          horizontal: 'right',
        },
      },
    )
  }

  return (
    <Toolbar mainButton={false} title='Library'>
      <Show when={props.installEvent}>
        <button
          className={styles.installButton}
          onClick={() => props.installEvent?.prompt()}
        >
          Install
        </button>
      </Show>
      <IconButton
        icon={IconType.SEARCH}
        title='Search'
        onClick={() => router.push('/search')}
      />
      <IconButton
        icon={IconType.MORE_VERTICAL}
        title='More actions'
        onClick={onMenuClickHandler}
      />
    </Toolbar>
  )
}

const NavButton = (props: LibraryPageConfig) => {
  const router = useRouter()
  const route = useRoute()

  const resolvedPath = createMemo(() => route.resolvePath(props.path) || '')

  const matcher = createMemo(() => {
    const path = resolvedPath()
    return path !== undefined
      ? router.utils.createMatcher(path, { end: true })
      : undefined
  })

  const isActive = createMemo(() => {
    const m = matcher()
    return m && !!m(router.location.path)
  })

  return (
    <button
      title={props.title}
      className={clx(styles.navBtn, isActive() && styles.navBtnSelected)}
      // Back button shouldn't change tabs, so replace instead of push.
      onClick={() => router.replace(resolvedPath())}
    >
      <Icon icon={props.icon} />
      <div className={styles.navBtnTitle}>{props.title}</div>
    </button>
  )
}

const NavRail = () => (
  <div className={styles.navRail}>
    <For each={LIBRARY_PAGES_CONFIG}>{NavButton}</For>
  </div>
)

const EmptyLibraryBanner = () => (
  <MessageBanner
    title={'Your Library is empty'}
    button={{
      title: 'Import some music',
      href: '/settings',
    }}
  />
)

const onEnter = (element: Element, done: () => void) => {
  if (prefersReducedMotion()) {
    animateFade(element, false, { duration: 100 }).finished.then(done)
    return
  }

  element
    .animate(
      {
        opacity: [0, 1],
        transform: ['scale(.92, .92)', 'none'],
      },
      {
        duration: 210,
        easing: EASING_INCOMING_80,
        fill: 'both',
      },
    )
    .finished.then(done)
}

const onExit = (element: Element, done: () => void) => {
  animateFade(element, true, {
    duration: 90,
    easing: EASING_OUTGOING_40,
    fill: 'both',
  }).finished.then(done)
}

export const Library: Component<LibraryProps> = (props) => {
  const [entities] = useEntitiesStore()

  return (
    <div className={styles.pageContainer}>
      <Header installEvent={props.installEvent} />
      <NavRail />
      <Show
        when={Object.keys(entities.tracks).length}
        fallback={EmptyLibraryBanner}
      >
        <Transition mode='outin' onEnter={onEnter} onExit={onExit}>
          <Switch>
            <For each={LIBRARY_PAGES_CONFIG}>
              {(route) => (
                <MatchRoute path={route.path} end>
                  <LibraryPage {...route} />
                </MatchRoute>
              )}
            </For>
          </Switch>
        </Transition>
      </Show>
    </div>
  )
}
