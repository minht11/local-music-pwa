import {
  createMemo,
  createSignal,
  For,
  JSXElement,
  Show,
  untrack,
} from 'solid-js'
import { useMatch } from 'solid-app-router'
import { Dynamic } from 'solid-js/web'
import { BaseMusicItem, MusicItemType } from '../../types/types'
import { useEntitiesStore } from '../../stores/stores'
import { CONFIGS } from './configs'
import { MessageBanner } from '../../components/message-banner/message-banner'
import { SearchHeader } from './search-header/search-header'
import { Scaffold } from '~/components/scaffold/scaffold'
import { Icon } from '~/components/icon/icon'
import { clx } from '~/utils'
import * as styles from './search.css'

export const SEARCH_MAIN_PATH = '/search/:searchTerm'

const sortedItemsByName = (items: BaseMusicItem[]) =>
  items.sort((a, b) => {
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

const Search = (): JSXElement => {
  const [entities] = useEntitiesStore()

  const searchMatch = useMatch(() => `${SEARCH_MAIN_PATH}/*`)
  const searchTerm = createMemo(() =>
    decodeURIComponent(searchMatch()?.params.searchTerm || ''),
  )

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
        throw new Error('Wrong type')
    }
  }

  const pages = CONFIGS.map((config) => {
    const [isSelected, setIsSelected] = createSignal(true)

    const itemIds = createMemo<string[]>((prev = []) => {
      const items = Object.values(itemsSelector(config.type)) as BaseMusicItem[]
      const isActive = isSelected()
      const term = searchTerm().trim().toLowerCase()

      return untrack(() => {
        if (term === '') {
          return items.map((item) => item.id)
        }

        if (!isActive) {
          return prev
        }

        const filteredItems = items.filter((item) => config.filter(term, item))
        const sortedItems = sortedItemsByName(filteredItems)

        return sortedItems.map((item) => item.id)
      })
    })

    return { ...config, itemIds, isSelected, setIsSelected }
  })

  const isNotEmpty = createMemo(() =>
    pages.some((page) => page.itemIds().length !== 0),
  )

  return (
    <Scaffold
      topBar={<SearchHeader searchTerm={searchTerm()} />}
      title='Search'
      scrollable
    >
      <div class={styles.chipsContainer}>
        <For each={pages}>
          {(page) => (
            <button
              class={clx(styles.chip, page.isSelected() && styles.chipSelected)}
              onClick={() => page.setIsSelected((prev) => !prev)}
            >
              <Icon icon='checkmark' class={styles.chipIcon} />
              {page.title}
            </button>
          )}
        </For>
      </div>
      <Show
        when={isNotEmpty()}
        fallback={<MessageBanner message='Nothing found' />}
      >
        <For each={pages}>
          {(page) => (
            <Show when={page.itemIds().length && page.isSelected()}>
              <h1 class={styles.resulsTitle}>{page.title}</h1>
              <Dynamic component={page.component} items={page.itemIds()} />
            </Show>
          )}
        </For>
      </Show>
    </Scaffold>
  )
}

export default Search
