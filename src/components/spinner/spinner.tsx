import { VoidComponent } from 'solid-js'
import { clx } from '../../utils'
import * as styles from './spinner.css'

export interface SpinnerProps {
  class?: string
}

export const Spinner: VoidComponent<SpinnerProps> = (props) => (
  <svg class={clx(styles.spinner, props.class)} viewBox='0 0 66 66'>
    <circle class={styles.path} cx='33' cy='33' r='30' />
  </svg>
)
