import { children, JSX, createRenderEffect, ParentComponent } from 'solid-js'
import { clickFocusedElement, clx, doesElementContainFocus } from '../../utils'
import { KeyboardCode } from '../../utils/key-codes'
import * as styles from './list.css'

export interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string
}

export const List: ParentComponent<ListProps> = (props) => {
  let listContainerEl: HTMLDivElement

  const listItems = children(() => props.children) as () => HTMLElement[]

  createRenderEffect(() => {
    listItems().forEach((el, index) =>
      el.setAttribute('tabindex', index === 0 ? '0' : '-1'),
    )
  })

  const query = (selector: string) =>
    listContainerEl.querySelector<HTMLElement>(
      `.${styles.listContainer} > ${selector}`,
    )

  const queryAndSetTabIndex = (value: -1 | 0, selector: string) => {
    const element = query(selector)
    if (element) {
      element.tabIndex = value
    }
    return element
  }

  const onKeyDownHandler = (e: KeyboardEvent) => {
    const { code } = e

    const isArrowDown = code === KeyboardCode.ARROW_DOWN
    if (isArrowDown || code === KeyboardCode.ARROW_UP) {
      let newFocusedEl

      // If list container is focused but not any of listitems
      // focus them instead.
      if (listContainerEl.matches(':focus')) {
        const selector = isArrowDown ? ':first-child' : ':last-child'
        newFocusedEl = query(selector)
      } else {
        const focusedEl = query(':focus-within')
        newFocusedEl = isArrowDown
          ? focusedEl?.nextElementSibling
          : focusedEl?.previousElementSibling
      }

      if (newFocusedEl instanceof HTMLElement) {
        newFocusedEl.focus()
      }
    } else if (code === KeyboardCode.ENTER) {
      if (!clickFocusedElement(listContainerEl)) {
        return
      }
    } else {
      return
    }
    e.preventDefault()
  }

  const onFocusInHandler = () => {
    queryAndSetTabIndex(-1, '[tabindex="0"]:not(:focus-within)')
    queryAndSetTabIndex(0, ':focus-within')
  }

  const onFocusOutHandler = () => {
    queryAndSetTabIndex(-1, '[tabindex="0"]:not(:focus-within)')
    queueMicrotask(() => {
      if (!doesElementContainFocus(listContainerEl)) {
        queryAndSetTabIndex(0, ':first-child')
      }
    })
  }

  return (
    <div
      {...props}
      class={clx(styles.listContainer, props.class)}
      role='list'
      tabIndex='-1'
      ref={(el) => {
        listContainerEl = el
        if (typeof props.ref === 'function') {
          props.ref(el)
        }
      }}
      onKeyDown={onKeyDownHandler}
      onFocusIn={onFocusInHandler}
      onFocusOut={onFocusOutHandler}
    >
      {listItems()}
    </div>
  )
}
