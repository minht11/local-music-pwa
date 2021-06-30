import {
  Component,
  createContext,
  createEffect,
  For,
  Match,
  on,
  Switch,
  useContext,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import '@a11y/focus-trap'
import { nanoid } from 'nanoid'
import { clx } from '../../utils'
import { Spinner } from '../spinner/spinner'
import * as styles from './toasts.css'

export interface ToastButton {
  title: string
  action?: () => void
}

export interface ToastItem {
  id?: string
  message: string
  duration?: false | number
  controls?: false | 'spinner' | ToastButton[]
}

export interface ToastContextProps {
  show(item: ToastItem): void
  hide(id: ToastItem['id']): void
}

interface ToastState {
  toasts: ToastItem[]
}

const DEFAULT_DURATION = 8000
const DEFAULT_BUTTON = {
  title: 'Dismiss',
}

const ToastContext = createContext<ToastContextProps>()
export const useToast = () => useContext(ToastContext) as ToastContextProps

const Toast = (props: ToastItem) => {
  const toasts = useToast()

  const hide = () => {
    toasts?.hide(props.id)
  }

  createEffect(
    on(
      () => props.duration,
      (duration) => {
        if (duration === false) {
          return
        }

        const timeoutDuration = duration ?? DEFAULT_DURATION

        setTimeout(() => {
          hide()
        }, timeoutDuration)
      },
    ),
  )

  return (
    <div className={styles.toastItem}>
      <div className={styles.message}>{props.message}</div>
      <div className={styles.buttons}>
        <Switch>
          <Match when={props.controls === 'spinner'}>
            <Spinner />
          </Match>
          <Match when={props.controls !== false}>
            <For each={(props.controls || [DEFAULT_BUTTON]) as ToastButton[]}>
              {(btnProps) => (
                <button
                  className={styles.btn}
                  onClick={() => {
                    btnProps.action?.()
                    hide()
                  }}
                >
                  {btnProps.title}
                </button>
              )}
            </For>
          </Match>
        </Switch>
      </div>
    </div>
  )
}

interface ToastProviderProps {
  className?: string
}

export const ToastProvider: Component<ToastProviderProps> = (props) => {
  const [state, setState] = createStore<ToastState>({
    toasts: [],
  })

  const filterToast = (id: ToastItem['id']) =>
    state.toasts.filter((item) => item.id !== id)

  const show = (item: ToastItem) => {
    const toastIndex = state.toasts.findIndex((t) => t.id === item.id)

    if (toastIndex === -1) {
      const newToast = {
        ...item,
        id: item.id || nanoid(),
      }

      setState('toasts', (t) => [...t, newToast])
      return
    }

    setState('toasts', toastIndex, item)
  }

  const hide = (id: ToastItem['id']) => {
    setState({
      toasts: filterToast(id),
    })
  }

  return (
    <ToastContext.Provider value={{ show, hide }}>
      <div className={clx(styles.container, props.className)}>
        <For each={state.toasts}>{Toast}</For>
      </div>
      {props.children}
    </ToastContext.Provider>
  )
}
