import { ActionTypes } from './types'
import { ToastData } from '../../components/x-toast'

export const addToast = (toast: ToastData) => ({
  payload: toast,
  type: ActionTypes.ADD_TOAST,
})

export const removeToast = (id: string) => ({
  payload: id,
  type: ActionTypes.REMOVE_TOAST,
})
