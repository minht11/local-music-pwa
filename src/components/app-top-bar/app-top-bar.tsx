import { useLocation, useNavigate } from 'solid-app-router'
import { ParentComponent, JSX, Match, Switch } from 'solid-js'
import { clx, wait } from '~/utils'
import { IconButton } from '../icon-button/icon-button'
import { useScaffoldContext } from '../scaffold/scaffold'
import * as styles from './app-top-bar.css'

const BackButton = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const pathname = () => location.pathname

  const onClickHandler = () => {
    const path = pathname()
    window.history.back()
    // If there are no entries inside history back button
    // won't work and user will be stuck.
    // Example: user loads new tab going straight to /settings,
    // when app back button is pressed, nothing happens because
    // this is the first entry in history.
    // To prevent this check if URL changed, after short delay,
    // if it didn't back button most likely didn't do anything.
    wait(50).then(() => {
      if (path === pathname()) {
        navigate('/')
      }
    })
  }

  return (
    <IconButton icon='backArrow' title='Back button' onClick={onClickHandler} />
  )
}

export interface AppTopBarProps {
  mainButton?: JSX.Element | false
  title?: string
  class?: string
  hideSpacer?: boolean
  belowContent?: JSX.Element
  scrollAware?: boolean
}

export const AppTopBar: ParentComponent<AppTopBarProps> = (props) => {
  const [state] = useScaffoldContext() || [{}]

  const scrollAware = () =>
    props.scrollAware === undefined ? true : props.scrollAware

  return (
    <header
      class={clx(
        styles.appTobBar,
        scrollAware() && state.isScolled && styles.elavated,
        props.class,
      )}
    >
      <div class={styles.content}>
        <Switch>
          <Match when={props.mainButton === undefined}>
            <BackButton />
          </Match>
          <Match when={props.mainButton}>{props.mainButton}</Match>
        </Switch>

        {props.title && <h1 class={styles.title}>{props.title}</h1>}

        {!props.hideSpacer && <div class={styles.spacer} />}

        {props.children}
      </div>
      {props.belowContent}
    </header>
  )
}
