import { clx } from '../../utils'
import * as styles from './spinner.css'

interface SpinnerProps {
  className?: string
}

export const Spinner = (props: SpinnerProps) => (
  <svg className={clx(styles.spinner, props.className)} viewBox='0 0 66 66'>
    <circle className={styles.path} cx='33' cy='33' r='30' />
  </svg>
)
