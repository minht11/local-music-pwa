import { createMemo } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { ScrollTargetContext } from '@minht11/solid-virtual-container'
import { sortByKey } from '../../utils'
import { IconButton, IconType } from '../icon-button/icon-button'
import { useMenu } from '../menu/menu'
import { useEntitiesStore, useLibraryStore } from '../../stores/stores'
import { BaseMusicItem, MusicItemType, Track } from '../../types/types'
import { useDocumentTitle } from '../../helpers/hooks/use-document-title'
import { APP_TITLE_POSTFIX } from '../../types/constants'
import { LibraryPageConfig } from './library-pages-config'
import * as styles from './library.css'

export function LibraryPage(props: LibraryPageConfig) {
  return () => {
    useDocumentTitle(`${props.title} ${APP_TITLE_POSTFIX}`)

    const menu = useMenu()

    const [dataState] = useEntitiesStore()
    const [libraryState, libraryActions] = useLibraryStore()

    const itemsSelector = () => {
      switch (props.type) {
        case MusicItemType.TRACK:
          return dataState.tracks
        case MusicItemType.ALBUM:
          return dataState.albums
        case MusicItemType.ARTIST:
          return dataState.artists
        case MusicItemType.PLAYLIST:
          return dataState.playlists
        default:
          throw new Error('Wrong item type')
      }
    }

    const itemIds = createMemo(() => {
      const itemsArray = sortByKey(
        [...Object.values<Track>(itemsSelector() as { [key: string]: Track })],
        libraryState.sortKeys[props.type] as keyof Track,
      ) as unknown as BaseMusicItem[]

      return itemsArray.map((item) => item.id)
    })

    const onSortMenuHandler = (e: MouseEvent) => {
      const menuItems = props.sortOptions.map((item) => ({
        name: item.name,
        action: () => {
          libraryActions.sort({ type: props.type, key: item.key })
        },
        selected: libraryState.sortKeys[props.type] === item.key,
      }))

      menu.show(menuItems, e.target as HTMLElement, {
        anchor: true,
        preferredAlign: { horizontal: 'right' },
        width: 124,
      })
    }

    let scrollTargetEl!: HTMLDivElement

    return (
      <div className={styles.libraryPageContainer} ref={scrollTargetEl}>
        <ScrollTargetContext.Provider value={{ scrollTarget: scrollTargetEl }}>
          <Dynamic
            component={props.component}
            items={itemIds()}
            actions={
              <>
                {props.actions}
                <IconButton
                  title='Open sort menu'
                  aria-haspopup='true'
                  aria-expanded='false'
                  icon={IconType.SORT}
                  onClick={onSortMenuHandler}
                />
              </>
            }
          />
        </ScrollTargetContext.Provider>
      </div>
    )
  }
}
