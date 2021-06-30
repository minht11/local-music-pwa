export const doesElementContainFocus = (element: Element): boolean =>
  element.matches(':focus-within')

export const findFocusedElement = (
  container: Element | Document,
): HTMLElement | null => {
  const element = container.querySelector(':focus')

  // If element contains focus it must be instanceof HTMLElement,
  // otherwise it's always null
  return element as HTMLElement | null
}

export const clickFocusedElement = (container: Element | Document): boolean => {
  const element = findFocusedElement(container)

  if (element) {
    element.click()
    return true
  }
  return false
}

// https://stackoverflow.com/questions/1599660/which-html-elements-can-receive-focus/1600194#1600194
const focusableElementQuery = `
  [tabindex]:not([tabindex='-1']),
  a[href]:not([tabindex='-1']),
  area[href]:not([tabindex='-1']),
  input:not([disabled]):not([tabindex='-1']),
  select:not([disabled]):not([tabindex='-1']),
  textarea:not([disabled]):not([tabindex='-1']),
  button:not([disabled]):not([tabindex='-1']),
  iframe:not([tabindex='-1']),
  [contentEditable=true]:not([tabindex='-1'])
`

export const isElementFocusable = (element: Element): boolean =>
  element.matches(focusableElementQuery)

export const findFocusableElement = (
  container: Element | Document,
): HTMLElement | null =>
  // https://stackoverflow.com/questions/1599660/which-html-elements-can-receive-focus/1600194#1600194
  container.querySelector(focusableElementQuery)
