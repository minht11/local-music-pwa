import { createStore } from 'solid-js/store'
import { nanoid } from 'nanoid'

export interface ToastButton {
  title: string
  action?: () => void
}

export interface ToastOptions {
  id?: string
  message: string
  duration?: false | number
  controls?: false | 'spinner' | ToastButton[]
}

const [toasts, setToasts] = createStore<ToastOptions[]>([])

export {
  toasts,
}

const createToastCreator = () => {
  const create = (options: ToastOptions): string => {
    let { id } = options

    const toastIndex =
      id !== undefined ? toasts.findIndex((t) => t.id === id) : -1
      
    if (toastIndex === -1) {
      id = id || nanoid()

      const newToast: ToastOptions = {
        ...options,
        id,
      }

      setToasts((t) => [...t, newToast])
    } else {
      setToasts(toastIndex, options)
    }

    return id as string
  }

  const dismiss = (id: string) => {
    setToasts((t) => t.filter((item) => item.id !== id))
  }

  create.dismiss = dismiss

  return create
}

export const toast = createToastCreator()
