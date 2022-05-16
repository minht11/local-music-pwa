import {
  createEffect,
  For,
  JSXElement,
  Match,
  Switch,
  untrack,
  VoidComponent,
} from 'solid-js'
import '@a11y/focus-trap'
import { Spinner } from '../spinner/spinner'
import { useToast, ToastProvider } from './toasts-provider'
import { ToastItem } from './types'
import * as styles from './toasts.css'

export { useToast, ToastProvider }

export interface ToastButton {
  title: string
  action?: () => void
}

const DEFAULT_DURATION = 8000
const DEFAULT_BUTTON = {
  title: 'Dismiss',
}

const Toast: VoidComponent<ToastItem> = (props) => {
  const toasts = useToast()

  const hide = () => toasts?.hide(props.id)

  createEffect(() => {
    const dur = props.duration
    untrack(() => {
      if (dur === false) {
        return
      }

      setTimeout(hide, dur ?? DEFAULT_DURATION)
    })
  })

  return (
    <div class={styles.toastItem}>
      <div class={styles.message}>{props.message}</div>
      <div class={styles.buttons}>
        <Switch>
          <Match when={props.controls === 'spinner'}>
            <Spinner class={styles.spinner} />
          </Match>
          <Match when={props.controls !== false}>
            <For each={(props.controls || [DEFAULT_BUTTON]) as ToastButton[]}>
              {(btnProps) => (
                <button
                  class={styles.btn}
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

export const Toasts = (): JSXElement => {
  const toasts = useToast()

  return <For each={toasts.toasts}>{(toast) => <Toast {...toast} />}</For>
}
