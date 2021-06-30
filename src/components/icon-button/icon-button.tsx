import { Component, JSX, splitProps } from 'solid-js'
import { clx } from '../../utils'
import { Icon, IconProps, IconType } from '../icon/icon'
import * as styles from './icon-button.css'

export { IconType }

export type IconButtonProps = Partial<IconProps> &
  Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'ref'> & {
    disabled?: boolean
  }

export const IconButton: Component<IconButtonProps> = (props) => {
  const [mainProps, rest] = splitProps(props, ['icon', 'className'])
  return (
    <button {...rest} className={clx(styles.iconButton, mainProps.className)}>
      {mainProps.icon ? <Icon icon={mainProps.icon} /> : props.children}
    </button>
  )
}
