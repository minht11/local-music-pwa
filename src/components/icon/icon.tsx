import { JSXElement } from 'solid-js'
import { clx } from '~/utils'
import { ICON_PATHS } from './icon-paths'
import * as styles from './icon.css'

export type IconType = keyof typeof ICON_PATHS

export interface IconProps {
  icon: IconType
  className?: string
}

export const Icon = (props: IconProps): JSXElement => (
  <svg viewBox='0 0 24 24' className={clx(styles.icon, props.className)}>
    <path d={ICON_PATHS[props.icon]} />
  </svg>
)
