import { Component, For, onCleanup, Show } from 'solid-js'
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

export const Modal: Component<ModalProps> = (props) => {
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
    <focus-trap className={styles.modal}>
      <div className={styles.header}>
        <h1 className={styles.title}>{props.title}</h1>
      </div>
      <ScrollContainer className={styles.content}>
        {props.children}
      </ScrollContainer>
      <Show when={props.buttons}>
        <div className={styles.bottomButtons}>
          <For each={props.buttons || []}>
            {(button) => (
              <button
                className={styles.flatButton}
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
