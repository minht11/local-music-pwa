import { JSX, ParentComponent } from 'solid-js'
import { clx } from '~/utils'
import { Icon, IconType } from '../icon/icon'
import * as styles from './icon-button.css'

export type { IconType }

export interface IconButtonProps {
  icon?: IconType
  title?: string
  class?: string
  disabled?: boolean
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
  tabIndex?: number
}

export const IconButton: ParentComponent<IconButtonProps> = (props) => (
  <button
    disabled={props.disabled}
    title={props.title}
    class={clx(styles.iconButton, props.class)}
    onClick={props.onClick}
    tabIndex={props.tabIndex}
  >
    {props.icon !== undefined ? <Icon icon={props.icon} /> : props.children}
  </button>
)
