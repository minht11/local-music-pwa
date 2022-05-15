import { For, onCleanup, ParentComponent, Show } from 'solid-js'
import '@a11y/focus-trap'
import { ScrollContainer } from '../scroll-container/scroll-container'
import { KeyboardCode } from '../../utils/key-codes'
import * as styles from './modal.css'

export interface ModalButton {
  type: 'confirm' | 'cancel'
  title: string
  disabled?: boolean
}

export interface ModalProps {
  title: string
  onConfirm?: () => void
  onCancel?: () => void
  buttons?: ModalButton[]
}

export const Modal: ParentComponent<ModalProps> = (props) => {
  const cancel = () => {
    props.onCancel?.()
  }

  const confirm = () => {
    props.onConfirm?.()
  }

  const onKeyDownHandler = (e: KeyboardEvent) => {
    if (e.code === KeyboardCode.ESC) {
      cancel()
    }
  }

  window.addEventListener('keydown', onKeyDownHandler)
  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDownHandler)
  })

  return (
    <focus-trap class={styles.modal}>
      <div class={styles.header}>
        <h1 class={styles.title}>{props.title}</h1>
      </div>
      <ScrollContainer class={styles.content}>{props.children}</ScrollContainer>
      <Show when={props.buttons}>
        <div class={styles.bottomButtons}>
          <For each={props.buttons || []}>
            {(button) => (
              <button
                class={styles.flatButton}
                disabled={button.disabled}
                onClick={() => {
                  if (button.type === 'cancel') {
                    cancel()
                  }
                  if (button.type === 'confirm') {
                    confirm()
                  }
                }}
              >
                {button.title}
              </button>
            )}
          </For>
        </div>
      </Show>
    </focus-trap>
  )
}
