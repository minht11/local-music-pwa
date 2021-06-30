import { NavLink } from '@rturnq/solid-router'
import * as styles from './not-found.css'

export const NotFound = () => (
  <div class={styles.notFound}>
    <h1 className={styles.title}>Page you were looking for was not found</h1>
    <NavLink href='/' className={styles.button}>
      Go Home
    </NavLink>
  </div>
)
