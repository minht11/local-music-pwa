import { createEffect, onCleanup } from 'solid-js'
import { createMediaQuery } from '../helpers/hooks/create-media-query'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends any[]>(
  callback: (...args: T) => void,
  wait: number,
): ((...args: T) => void) => {
  let timeout: number | undefined
  return function debounceInternal(this: unknown, ...args: T) {
    clearTimeout(timeout)
    timeout = window.setTimeout(() => callback.apply(this, args), wait)
  }
}

const getNumberWithLeadingZero = (n: number) => `${n < 10 ? '0' : ''}${n}`

export const formatTime = (ms?: number): string => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) {
    return '--:--'
  }

  const hours = Math.floor(ms / 60 / 60)
  const minutes = Math.floor((ms % 3600) / 60)
  const seconds = Math.floor((ms % 3600) % 60)
  const time: (number | string)[] = [
    getNumberWithLeadingZero(minutes),
    getNumberWithLeadingZero(seconds),
  ]

  if (hours) {
    time.unshift(hours)
  }

  return time.join(':')
}

export const swapArrayItems = <T>(
  array: T[],
  firstItemIndex: number,
  secondItemIndex: number,
): T[] => {
  if (
    firstItemIndex < 0 ||
    firstItemIndex > array.length ||
    secondItemIndex < 0 ||
    secondItemIndex > array.length
  ) {
    return array
  }

  const temporaryValue = array[firstItemIndex]
  array[firstItemIndex] = array[secondItemIndex]
  array[secondItemIndex] = temporaryValue
  return array
}

export const shuffleArray = <T>(
  array: readonly T[],
  moveToStartIndex = 0,
): T[] => {
  const shuffledArray = [...array]
  let currentIndex = array.length

  if (currentIndex < 1) {
    return shuffledArray
  }

  // Move selected element to start.
  if (moveToStartIndex > 0) {
    swapArrayItems(shuffledArray, 0, moveToStartIndex)
  }

  // Shuffle array.
  while (currentIndex !== 1) {
    currentIndex -= 1
    const randomIndex = Math.floor(Math.random() * currentIndex + 1)
    swapArrayItems(shuffledArray, currentIndex, randomIndex)
  }
  return shuffledArray
}

export const sortByKey = <T>(list: T[], key: keyof Partial<T>): T[] =>
  list.sort((a, b) => {
    const itemA = a[key]
    const itemB = b[key]

    if (itemA && itemB) {
      if (typeof itemA === 'number' && typeof itemB === 'number') {
        return itemA - itemB
      }

      let itemAString: string
      let itemBString: string

      if (typeof itemA === 'string' && typeof itemB === 'string') {
        itemAString = itemA
        itemBString = itemB
      } else if (Array.isArray(itemA) && Array.isArray(itemB)) {
        itemAString = itemA.join(' ')
        itemBString = itemB.join(' ')
      } else {
        return 0
      }

      const itemAStringFormated = itemAString.toLowerCase()
      const itemBStringFormated = itemBString.toLowerCase()

      if (itemAStringFormated < itemBStringFormated) {
        return -1
      }

      if (itemAStringFormated > itemBStringFormated) {
        return 1
      }
    }
    
    if (itemA) {
      return -1
    }
    
    if (itemB) {
      return 1
    }

    return 0
  })

export const rafPromise = (): Promise<number> =>
  new Promise((resolve) => {
    requestAnimationFrame(resolve)
  })

export const wait = (duration: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })

interface CSSProperties {
  // Probbaly should use 'csstype' package instead.
  [key: string]: string | number
  [key: `--${string}`]: string | number
}

type SingleOrArray<T> = T | T[]

const alwaysGetArray = <T>(item: T | T[]): T[] =>
  Array.isArray(item) ? item : [item]

export const setStyles = (
  element: SingleOrArray<HTMLElement>,
  styles: Partial<CSSProperties>,
): void => {
  const stylesEntries = Object.entries(styles)
  alwaysGetArray(element).forEach((el) =>
    stylesEntries.forEach(([key, value]) => {
      el.style.setProperty(key, value === undefined ? '' : `${value}`)
    }),
  )
}

export const removeStyles = (
  element: SingleOrArray<HTMLElement>,
  styleNames: (keyof CSSProperties)[],
): void => {
  alwaysGetArray(element).forEach((el) => {
    styleNames.forEach((name) => el.style.removeProperty(`${name}`))
  })
}

export const isElementTextInput = <T>(target: T): boolean =>
  target instanceof HTMLInputElement && target.type === 'text'

export const isEventMeantForTextInput = (e: Event): boolean => {
  const path = e.composedPath()
  return path.some((el) => isElementTextInput(el))
}

const animationsTimeouts = new WeakMap<Element, boolean>()
// TODO. This function name could be better.
export const animateIcon = (
  e: MouseEvent,
  duration: number,
  className: string,
) => {
  const element = e.composedPath()[0] as HTMLElement
  element.classList.add(className)

  const isAnimationRunning = animationsTimeouts.get(element)
  if (!isAnimationRunning) {
    wait(duration).then(() => {
      element.classList.remove(className)
      animationsTimeouts.delete(element)
    })
    animationsTimeouts.set(element, true)
  }
}

export const toggleReverseArray = <T>(items: T[], condition = false) =>
  condition ? [...items].reverse() : items

type ClxArgType = string | number | false | undefined | null
export const clx = <Args extends ClxArgType[]>(...args: Args) => {
  let str = ''
  for (const value of args) {
    if (value) {
      str += ` ${value}`
    }
  }
  return str
}

const pluralRules = new Intl.PluralRules('en-US')

export const pluralize = (count: number, singular: string) => {
  const grammaticalNumber = pluralRules.select(count)

  switch (grammaticalNumber) {
    case 'one':
      return singular
    case 'other':
      return `${singular}s`
    default:
      return singular
  }
}

export const pluralizeCount = (count: number, singular: string) =>
  `${count} ${pluralize(count, singular)}`

export const usePrefersReducedMotion = () =>
  createMediaQuery('(prefers-reduced-motion: reduce)')

export const useDarkThemeEnabled = () =>
  createMediaQuery('(prefers-color-scheme: dark)')

export const useResizeObserver = (
  element: () => HTMLElement,
  callback: (entry: ResizeObserverEntry) => void,
) => {
  const ro = new ResizeObserver(([entry]) => {
    callback(entry)
  })

  createEffect(() => {
    const el = element()
    ro.observe(el)
    onCleanup(() => ro.unobserve(el))
  })
}

const isMobile = () => {
  if (navigator.userAgentData) {
    return navigator.userAgentData.mobile
  }

  return /Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
}

export const IS_DEVICE_A_MOBILE = isMobile()
