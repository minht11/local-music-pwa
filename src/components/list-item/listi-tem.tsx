import { JSX, Show, VoidComponent } from 'solid-js'
import { clx } from '~/utils'
import { IconButton } from '../icon-button/icon-button'
import { useMenu, MenuOptions, MenuItem } from '../menu/menu'
import * as styles from './list-item.css'

export interface ListItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  text: string
  secondaryText?: string
  icon?: JSX.Element
  trailing?: JSX.Element
  class?: string
  tabIndex?: number
  style?: string | JSX.CSSProperties
  onClick?: (e: MouseEvent) => void
  getMenuItems?: () => (MenuItem | undefined | false)[]
  disableMenu?: boolean
  isSelected?: boolean
}

export const ListItem: VoidComponent<ListItemProps> = (props) => {
  const menu = useMenu()

  const onMenuHandler = (anchor: boolean, e: MouseEvent) => {
    if (props.disableMenu) {
      return
    }

    e.stopPropagation()
    e.preventDefault()

    const options: MenuOptions = anchor
      ? { anchor: true, preferredAlign: { horizontal: 'right' } }
      : { anchor: false, position: { top: e.y, left: e.x } }

    const items = props.getMenuItems?.().filter(Boolean) as
      | MenuItem[]
      | undefined

    if (!items) {
      return
    }

    menu.show(items, e.target as HTMLElement, options)
  }

  return (
    <div
      role='listitem'
      tabIndex={props.tabIndex}
      onClick={props.onClick}
      class={clx(
        styles.listItem,
        props.isSelected && styles.selected,
        props.class,
      )}
      style={props.style}
      onContextMenu={[onMenuHandler, false]}
    >
      {props.icon && <div class={styles.icon}>{props.icon}</div>}
      <div class={styles.textContainer}>
        <div class={styles.mainText}>{props.text}</div>
        <div class={styles.textEclipse}>{props.secondaryText}</div>
      </div>
      {props.trailing && <div class={styles.trailing}>{props.trailing}</div>}
      <Show when={!props.disableMenu}>
        <IconButton
          title='More actions'
          icon='moreVertical'
          tabIndex={props.tabIndex}
          onClick={[onMenuHandler, true]}
          class={styles.menu}
        />
      </Show>
    </div>
  )
}
