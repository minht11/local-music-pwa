import { ParentComponent, createContext, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { nanoid } from 'nanoid'
import { ToastItem } from './types'

export interface ToastContextProps {
  show(this: void, item: ToastItem): void
  hide(this: void, id: ToastItem['id']): void
  toasts: readonly ToastItem[]
}

export interface ToastState {
  toasts: ToastItem[]
}

const ToastContext = createContext<ToastContextProps>()
export const useToast = () => useContext(ToastContext) as ToastContextProps

export const ToastProvider: ParentComponent = (props) => {
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
    setState('toasts', filterToast(id))
  }

  return (
    <ToastContext.Provider
      value={{
        show,
        hide,
        get toasts() {
          return state.toasts as ToastItem[]
        },
      }}
    >
      {props.children}
    </ToastContext.Provider>
  )
}
