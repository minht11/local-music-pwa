import { Component, createMemo, For, Show, untrack } from 'solid-js'
import { NavLink, useRoute, useRouter } from '@rturnq/solid-router'
import { Dynamic } from 'solid-js/web'
import { Transition } from 'solid-transition-group'
import { ScrollTargetContext } from '@minht11/solid-virtual-container'
import { BaseMusicItem, MusicItemType } from '../../types/types'
import { NotFound } from '../not-found/not-found'
import { animateFade } from '../../helpers/animations/animations'
import { useEntitiesStore } from '../../stores/stores'
import { useDocumentTitle } from '../../helpers/hooks/use-document-title'
import { APP_TITLE_POSTFIX } from '../../types/constants'
import { SEARCH_PAGES_CONFIG } from './search-pages-config'
import { MessageBanner } from '../message-banner/message-banner'
import { SearchHeader } from './search-header/search-header'
import * as sharedStyles from '../../styles/shared.css'
import * as styles from './search.css'
import {
  EASING_INCOMING_80,
  EASING_INCOMING_80_OUTGOING_40,
  EASING_OUTGOING_40,
} from '../../helpers/animations/view-transition'
import { prefersReducedMotion } from '../../utils'

export const SEARCH_MAIN_PATH = '/search/:searchTerm?'

const EmptyResults = () => (
  <MessageBanner
    title='Nothing found'
    message='Try using different search keywords'
  />
)

export const Search: Component = () => {
  useDocumentTitle(`Search ${APP_TITLE_POSTFIX}`)

  const router = useRouter()
  const route = useRoute()

  const [entities] = useEntitiesStore()

  const searchTerm = createMemo(() =>
    decodeURIComponent(route.params.searchTerm || ''),
  )

  const { createMatcher } = router.utils
  const mainSearchPathMatcher = createMatcher(SEARCH_MAIN_PATH, { end: true })
  const isMainSearchPath = () => mainSearchPathMatcher(router.location.path)

  const itemsSelector = (type: MusicItemType) => {
    switch (type) {
      case MusicItemType.TRACK:
        return entities.tracks
      case MusicItemType.ARTIST:
        return entities.artists
      case MusicItemType.ALBUM:
        return entities.albums
      case MusicItemType.PLAYLIST:
        return entities.playlists
      default:
        return {}
    }
  }

  const pages = SEARCH_PAGES_CONFIG.map((config) => {
    const pathMatcher = createMatcher(`${SEARCH_MAIN_PATH}/${config.path}`, {
      end: true,
    })
    const isPathActive = () => pathMatcher(router.location.path)

    const itemIds = createMemo<string[]>((prev = []) => {
      const items = itemsSelector(config.type)
      const isMain = isMainSearchPath()
      const isActive = isPathActive()
      const term = searchTerm().trim().toLowerCase()

      return untrack(() => {
        if (!isMain && !isActive) {
          return prev
        }

        if (term === '') {
          return prev
        }

        const values = Object.values(items)

        const filteredItems = values.filter((item) =>
          config.filter(item, term),
        ) as BaseMusicItem[]

        const sortedItems = filteredItems.sort((a, b) => {
          const valueA = a.name.toLowerCase().trim()
          const valueB = b.name.toLowerCase().trim()

          if (valueA < valueB) {
            return -1
          }
          if (valueA > valueB) {
            return 1
          }

          return 0
        })

        return sortedItems.map((item) => item.id)
      })
    })

    return { ...config, itemIds, isPathActive }
  })

  const FullPage = () => {
    let scrollTarget!: HTMLDivElement

    return (
      <div className={styles.resultsContainer} ref={scrollTarget}>
        <ScrollTargetContext.Provider value={{ scrollTarget }}>
          <For each={pages}>
            {(page) => (
              <Show when={page.isPathActive()}>
                <div className={styles.resulsTitle}>
                  {page.title} results for "{searchTerm()}"
                </div>
                <Show when={page.itemIds().length} fallback={EmptyResults}>
                  <Dynamic component={page.component} items={page.itemIds()} />
                </Show>
              </Show>
            )}
          </For>
        </ScrollTargetContext.Provider>
      </div>
    )
  }

  const renderPreviewSection = (config: typeof pages[number]) => {
    const items = createMemo(() => {
      const itemIds = config.itemIds()
      const count = config.maxPreviewCount

      return count === undefined ? itemIds : [...itemIds].splice(0, count)
    })

    const totalCount = () => config.itemIds().length

    return (
      <Show when={totalCount()}>
        <Dynamic
          component={config.previewComponent || config.component}
          items={items()}
          count={totalCount()}
          actions={
            <NavLink
              href={`/search/${encodeURIComponent(searchTerm())}/${
                config.path
              }`}
              className={sharedStyles.button.pill.regular}
            >
              See all
            </NavLink>
          }
        />
      </Show>
    )
  }

  const PreviewResults = () => {
    const isEmpty = () => pages.every((item) => item.itemIds().length === 0)

    let scrollTarget!: HTMLDivElement

    return (
      <div className={styles.resultsContainer} ref={scrollTarget}>
        <ScrollTargetContext.Provider value={{ scrollTarget }}>
          <div className={styles.resulsTitle}>Results for "{searchTerm()}"</div>
          <Show
            when={isEmpty()}
            fallback={<For each={pages}>{renderPreviewSection}</For>}
          >
            <EmptyResults />
          </Show>
        </ScrollTargetContext.Provider>
      </div>
    )
  }

  const animateSlide = (element: Element, exit = false) => {
    const keyframes = ['translateY(18px)', 'none']
    return element.animate(
      {
        transform: exit ? keyframes.reverse() : keyframes,
      },
      { duration: 300, easing: EASING_INCOMING_80_OUTGOING_40 },
    ).finished
  }

  const onEnter = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    animateFade(element, false, {
      duration: 210,
      easing: EASING_INCOMING_80,
    })

    animateSlide(element).then(done)
  }

  const onExit = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    animateFade(element, true, {
      duration: 90,
      easing: EASING_OUTGOING_40,
    }).finished.then(done)

    animateSlide(element, true)
  }

  return (
    <Show when={true} fallback={NotFound}>
      <div className={styles.page}>
        <SearchHeader searchTerm={searchTerm()} />
        <Show
          when={searchTerm() !== ''}
          fallback={<MessageBanner message='Your searches will appear here' />}
        >
          <Transition onEnter={onEnter} onExit={onExit}>
            <Show when={isMainSearchPath()} fallback={FullPage}>
              <PreviewResults />
            </Show>
          </Transition>
        </Show>
      </div>
    </Show>
  )
}
