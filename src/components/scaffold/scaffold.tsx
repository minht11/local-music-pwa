import {
  createContext,
  createEffect,
  JSXElement,
  ParentComponent,
  Show,
  useContext,
} from 'solid-js'
import { createStore, SetStoreFunction } from 'solid-js/store'
import { clx } from '~/utils'
import { AppTopBar } from '../app-top-bar/app-top-bar'
import { ScrollContainer } from '../scroll-container/scroll-container'
import * as styles from './scaffold.css'

export interface ScaffoldProps {
  title?: string
  topBar?: string | JSXElement
  bottomBar?: JSXElement
  navRail?: JSXElement
  class?: string | false
  scrollable?: boolean
}

export interface ScaffoldContextState {
  isScolled: boolean
}

export type ScaffoldContextValue = [
  ScaffoldContextState,
  SetStoreFunction<ScaffoldContextState>,
]

const getTopBar = (topBar: ScaffoldProps['topBar'], title?: string) => {
  if (topBar === false) {
    return null
  }

  if (
    typeof topBar === 'string' ||
    (title !== undefined && topBar === undefined)
  ) {
    return <AppTopBar title={topBar || title} />
  }

  return topBar
}

export const ScaffoldContext = createContext<ScaffoldContextValue>()
export const useScaffoldContext = () =>
  useContext(ScaffoldContext) as ScaffoldContextValue

export const Scaffold: ParentComponent<ScaffoldProps> = (props) => {
  const [state, setState] = createStore<ScaffoldContextState>({
    isScolled: false,
  })

  createEffect(() => {
    const pageTitle = props.title && `${props.title} • Snae Player`
    if (pageTitle) {
      document.title = pageTitle
    }
  })

  return (
    <ScaffoldContext.Provider value={[state, setState]}>
      <div class={clx(styles.container, props.class)}>
        <div class={styles.topBar}>{getTopBar(props.topBar, props.title)}</div>

        <div class={styles.navRail}>{props.navRail}</div>

        <div class={styles.content}>
          <Show when={props.scrollable} fallback={props.children}>
            <ScrollContainer observeScrollState>
              {props.children}
            </ScrollContainer>
          </Show>
        </div>
        <div class={styles.bottomBar}>{props.bottomBar}</div>
      </div>
    </ScaffoldContext.Provider>
  )
}
