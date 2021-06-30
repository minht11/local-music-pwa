import { Component, JSX, Match, Show, Switch } from 'solid-js'
import { clx } from '../../utils'
import { BackButton } from '../back-button/back-button'
import * as styles from './toolbar.css'

export interface ToolbarProps {
  mainButton?: JSX.Element | false
  title?: string
  className?: string
  hideSpacer?: boolean
}

export const Toolbar: Component<ToolbarProps> = (props) => (
  <header className={clx(styles.toolbar, props.className)}>
    <Switch>
      <Match when={props.mainButton === undefined}>
        <BackButton />
      </Match>
      <Match when={props.mainButton}>{(btn) => btn}</Match>
    </Switch>
    <Show when={props.title}>
      {(title) => <h1 className={styles.title}>{title}</h1>}
    </Show>
    <Show when={!props.hideSpacer}>
      <div className={styles.spacer} />
    </Show>
    {props.children}
  </header>
)
