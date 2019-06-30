import { ToastData } from '../../components/x-toast'

export type State = ToastData[]

export const enum ActionTypes {
  ADD_TOAST = '@@toasts/ADD_TOAST',
  REMOVE_TOAST = '@@toasts/REMOVE_TOAST',
}
