import { createEffect, onCleanup } from 'solid-js'

export const useDocumentTitle = (title: string | (() => string)): void => {
  const previousTitle = document.title

  const titleValue = () => (typeof title === 'string' ? title : title())

  createEffect(() => {
    document.title = titleValue()
  })

  onCleanup(() => {
    requestAnimationFrame(() => {
      if (document.title === titleValue()) {
        document.title = previousTitle
      }
    })
  })
}
