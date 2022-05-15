import { ParentComponent } from 'solid-js'
import { CSSTransition } from '../css-transition/css-transition'
import * as styles from './page-transition.css'

export interface PageTransitionProps {
  forwards?: boolean
}

export const PageTransition: ParentComponent<PageTransitionProps> = (props) => (
  <CSSTransition
    enter={props.forwards ? styles.enterForwards : styles.enterBackwards}
    exit={props.forwards ? styles.exitForwards : styles.exitBackwards}
  >
    {props.children}
  </CSSTransition>
)
