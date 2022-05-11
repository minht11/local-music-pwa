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
