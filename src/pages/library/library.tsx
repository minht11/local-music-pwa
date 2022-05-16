import { createMemo, createSignal, For, JSXElement, Show } from 'solid-js'
import { Outlet, useNavigate, NavLink, useMatch } from 'solid-app-router'
import { CSSTransition } from '~/components/css-transition/css-transition'
import { Icon } from '~/components/icon/icon'
import { IconButton } from '~/components/icon-button/icon-button'
import { useMenu } from '~/components/menu/menu'
import { useEntitiesStore, useLibraryStore } from '~/stores/stores'
import { MessageBanner } from '~/components/message-banner/message-banner'
import { LibraryPageConfig, CONFIG } from './config'
import { MusicItemType } from '~/types/types'
import { useMapRouteToValue } from '~/helpers/router-match'
import { Scaffold } from '~/components/scaffold/scaffold'
import { AppTopBar } from '~/components/app-top-bar/app-top-bar'
import { createMediaQuery } from '~/helpers/hooks/create-media-query'
import { clx, IS_DEVICE_A_MOBILE } from '~/utils'
import * as styles from './library.css'

const [installEvent, setInstallEvent] = createSignal<BeforeInstallPromptEvent>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  setInstallEvent(e as BeforeInstallPromptEvent)
})

interface TopBar {
  tabs?: JSXElement
}

const TopBar = (props: TopBar) => {
  const navigate = useNavigate()
  const menu = useMenu()
  const [libraryState, libraryActions] = useLibraryStore()

  const onMenuClickHandler = (e: MouseEvent) => {
    menu.show(
      [
        {
          name: 'Settings',
          action: () => navigate('/settings'),
        },
        {
          name: 'About',
          action: () => navigate('/about'),
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

  const routeMatch = useMatch(() => '/library/:page')
  const selectedPage = createMemo(() => {
    const PAGE_TO_TYPE_MAP = {
      tracks: MusicItemType.TRACK,
      albums: MusicItemType.ALBUM,
      artists: MusicItemType.ARTIST,
      playlists: MusicItemType.PLAYLIST,
    }

    const page = routeMatch()?.params.page as keyof typeof PAGE_TO_TYPE_MAP

    return PAGE_TO_TYPE_MAP[page]
  })

  const onSortMenuHandler = (e: MouseEvent) => {
    const pageType = selectedPage()
    const pageConfig = CONFIG.find((c) => c.type === pageType)

    if (!pageConfig || pageType === undefined) {
      return
    }

    const menuItems = pageConfig.sortOptions.map((item) => ({
      name: item.name,
      action: () => {
        libraryActions.sort({ type: pageType, key: item.key as 'name' })
      },
      selected: libraryState.sortKeys[pageType] === item.key,
    }))

    menu.show(menuItems, e.target as HTMLElement, {
      anchor: true,
      preferredAlign: { horizontal: 'right' },
      width: 124,
    })
  }

  const onInstallClickHandler = () => {
    const installE = installEvent()
    if (!installE) {
      return
    }

    installE
      .prompt()
      .then(() => installE.userChoice)
      .then((choice) => {
        if (choice.outcome === 'accepted') {
          setInstallEvent(undefined)
        }
      })
  }

  return (
    <AppTopBar mainButton={false} title='Library' belowContent={props.tabs}>
      <Show when={installEvent()}>
        <button class={styles.tonalButton} onClick={onInstallClickHandler}>
          Install
        </button>
      </Show>
      <IconButton
        icon='search'
        title='Search'
        onClick={() => navigate('/search')}
      />
      <IconButton icon='sort' title='Sort' onClick={onSortMenuHandler} />
      <IconButton
        icon='moreVertical'
        title='More actions'
        onClick={onMenuClickHandler}
      />
    </AppTopBar>
  )
}

const NavButton = (props: LibraryPageConfig) => (
  <NavLink
    activeClass={styles.navBtnSelected}
    class={styles.navBtn}
    href={props.path}
    replace
  >
    <Icon icon={props.icon} />
  </NavLink>
)

interface NavigationButtonsProps {
  type: 'rail' | 'bottom' | 'tabs'
}

const getNavButtonsclass = (type: NavigationButtonsProps['type']) => {
  switch (type) {
    case 'rail':
      return styles.navRail
    case 'bottom':
      return styles.navBottomBar
    case 'tabs':
      return styles.navTabs
    default:
      throw new Error('Unknown type')
  }
}

const NavigationButtons = (props: NavigationButtonsProps) => (
  <div
    class={clx(
      getNavButtonsclass(props.type),
      props.type === 'bottom' && styles.elavated,
    )}
  >
    <For each={CONFIG}>{NavButton}</For>
  </div>
)

const Library = (): JSXElement => {
  const [entities] = useEntitiesStore()

  const isMedium = createMediaQuery('(max-width: 500px)')

  const selectedPage = useMapRouteToValue({
    '/library/tracks': () => MusicItemType.TRACK,
    '/library/albums': () => MusicItemType.ALBUM,
    '/library/artists': () => MusicItemType.ARTIST,
    '/library/playlists': () => MusicItemType.PLAYLIST,
  })

  const pageConfig = createMemo(
    () => CONFIG.find((c) => c.type === selectedPage())!,
  )

  return (
    <Scaffold
      title={`Library ${pageConfig()?.title}`}
      topBar={
        <TopBar
          tabs={
            isMedium() &&
            !IS_DEVICE_A_MOBILE && <NavigationButtons type='tabs' />
          }
        />
      }
      navRail={!isMedium() && <NavigationButtons type='rail' />}
      bottomBar={
        isMedium() && IS_DEVICE_A_MOBILE && <NavigationButtons type='bottom' />
      }
    >
      <Show
        when={Object.keys(entities.tracks).length}
        fallback={
          <MessageBanner
            title='Your Library is empty'
            button={{
              title: 'Import some music',
              href: '/settings',
            }}
          />
        }
      >
        <div class={styles.content}>
          <CSSTransition enter={styles.enterPage} exit={styles.exitPage}>
            <Outlet />
          </CSSTransition>
        </div>
      </Show>
    </Scaffold>
  )
}

export default Library
