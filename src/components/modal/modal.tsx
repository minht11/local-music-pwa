import { Component, For, onCleanup, Show } from 'solid-js'
import { ScrollTargetContext } from '@minht11/solid-virtual-container'
import '@a11y/focus-trap'
import { Icon, IconType } from '../icon/icon'
import { KeyboardCode } from '../../utils/key-codes'
import * as styles from './modal.css'

interface ModalButton {
  type: 'confirm' | 'cancel'
  title: string
  disabled?: boolean
}

export interface ModalProps {
  titleIcon: IconType
  title: string
  onConfirm?: () => void
  onCancel?: () => void
  buttons?: ModalButton[]
}

export const Modal: Component<ModalProps> = (props) => {
  /* eslint-disable prefer-const */
  let scrollTargetEl = undefined as unknown as HTMLDivElement
  /* eslint-enable prefer-const */

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
        <Icon icon={props.titleIcon} />
        <h1 className={styles.title}>{props.title}</h1>
      </div>
      <div className={styles.content} ref={scrollTargetEl}>
        <ScrollTargetContext.Provider value={{ scrollTarget: scrollTargetEl }}>
          {props.children}
        </ScrollTargetContext.Provider>
      </div>
      <Show when={props.buttons}>
        <div className={styles.bottomButtons}>
          <For each={props.buttons || []}>
            {(button) => (
              <button
                className={styles.btn}
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
