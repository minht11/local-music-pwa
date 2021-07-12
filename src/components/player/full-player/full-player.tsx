import { MatchRoute } from '@rturnq/solid-router'
import { Transition } from 'solid-transition-group'
import { Show, Switch } from 'solid-js'
import { ControlsPane } from './controls-pane'
import { QueuePane } from './queue-pane'
import {
  animateViewEnterBackwards,
  animateViewEnterForwards,
  animateViewExitBackwards,
  animateViewExitForwards,
} from '../../../helpers/animations/view-transition'
import { prefersReducedMotion } from '../../../utils'
import { PLAYER_PATH, PLAYER_QUEUE_PATH } from '../player'
import * as styles from './full-player.css'

interface FullPlayerProps {
  isCompact: boolean
}

const onEnter = (element: Element, done: () => void) => {
  if (prefersReducedMotion()) {
    done()
    return
  }

  if (element.classList.contains(styles.controlsPane)) {
    animateViewEnterBackwards(element).then(done)
    return
  }
  animateViewEnterForwards(element).then(done)
}

const onExit = (element: Element, done: () => void) => {
  if (prefersReducedMotion()) {
    done()
    return
  }

  if (element.classList.contains(styles.controlsPane)) {
    animateViewExitForwards(element).then(done)
    return
  }
  animateViewExitBackwards(element).then(done)
}

const FullPlayerCompact = () => (
  <Transition onEnter={onEnter} onExit={onExit}>
    <Switch>
      <MatchRoute path={PLAYER_PATH} end>
        <ControlsPane isCompact />
      </MatchRoute>
      <MatchRoute path={PLAYER_QUEUE_PATH} end>
        <QueuePane isCompact />
      </MatchRoute>
    </Switch>
  </Transition>
)

export const FullPlayer = (props: FullPlayerProps) => (
  <div className={styles.fpContainer}>
    <Show when={!props.isCompact} fallback={FullPlayerCompact}>
      <ControlsPane />
      <QueuePane />
    </Show>
  </div>
)
