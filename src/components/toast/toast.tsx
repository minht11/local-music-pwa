import {
  createEffect,
  For,
  Match,
  Switch,
  untrack,
  VoidComponent,
} from 'solid-js'
import '@a11y/focus-trap'
import { Spinner } from '../spinner/spinner'
import * as styles from './toasts.css'
import { toast, toasts, ToastOptions, ToastButton } from './store'

export { toast }
export type { ToastOptions, ToastButton }

const DEFAULT_DURATION = 8000
const DEFAULT_BUTTON = {
  title: 'Dismiss',
}

const ToastItem: VoidComponent<ToastOptions> = (props) => {
  const dismiss = () => toast.dismiss(props.id as string)

  createEffect(() => {
    const dur = props.duration
    untrack(() => {
      if (dur === false) {
        return
      }

      setTimeout(dismiss, dur ?? DEFAULT_DURATION)
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
                    dismiss()
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

export const Toaster: VoidComponent = () => (
  <For each={toasts as ToastOptions[]}>
    {(t: ToastOptions) => <ToastItem {...t} />}
  </For>
)
