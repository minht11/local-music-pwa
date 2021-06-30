import { Component } from 'solid-js'
import { clx } from '../../utils'
import { IconType, ICON_PATHS } from './icon-paths'
import * as styles from './icon.css'

export { IconType }

export interface IconProps {
  icon: IconType
  className?: string
}

export const Icon: Component<IconProps> = (props) => (
  <svg viewBox='0 0 24 24' className={clx(styles.icon, props.className)}>
    <path d={ICON_PATHS[props.icon]} />
  </svg>
)
