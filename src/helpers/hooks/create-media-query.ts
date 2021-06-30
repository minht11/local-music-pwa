import { createSignal, onCleanup } from 'solid-js'

export const createMediaQuery = (query: string): (() => boolean) => {
  const mql = window.matchMedia(query)

  const [doesMatch, setDoesMatch] = createSignal<boolean>(mql.matches)

  const onChangeHandler = (e: MediaQueryListEvent) => {
    setDoesMatch(e.matches)
  }

  mql.addEventListener('change', onChangeHandler)

  onCleanup(() => {
    mql.removeEventListener('change', onChangeHandler)
  })

  return doesMatch
}
