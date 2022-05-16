import {
  createContext,
  For,
  JSXElement,
  ParentComponent,
  Show,
  useContext,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { FocusTrap } from '@a11y/focus-trap'
import { EASING_INCOMING_80 } from '../../styles/shared.css'
import { clx, doesElementContainFocus } from '../../utils'
import { getMeasurementsFromAnchor } from './helpers/get-menu-position-from-anchor'
import { animateFade } from '../../helpers/animations/animations'
import { KeyboardCode } from '../../utils/key-codes'
import { List } from '../list/list'
import type {
  MenuContextProps,
  MenuItem,
  MenuPosition,
  MenuState,
  MenuOptions,
} from './types'
import { positionMenu } from './helpers/position-menu'
import * as styles from './menu.css'

export type { MenuItem, MenuOptions }

const MenuContext = createContext<MenuContextProps>()
export const useMenu = () => useContext(MenuContext) as MenuContextProps

export const MenuProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<MenuState>({
    isOpen: false,
    items: [],
  })

  let menuEl!: HTMLDivElement

  let elementToReturnFocusTo: HTMLElement | undefined

  const show: MenuContextProps['show'] = (
    itemsOrComponent,
    element,
    options,
  ) => {
    elementToReturnFocusTo = element

    let items: MenuItem[] = []
    let component

    if ('component' in itemsOrComponent) {
      component = itemsOrComponent.component
    } else {
      items = itemsOrComponent
    }

    setState({
      isOpen: true,
      items,
      component,
    })

    const baseRect = menuEl.getBoundingClientRect()
    const rect = {
      ...baseRect,
      width: options.width ?? baseRect.width,
      height: options.height ?? baseRect.height,
    }

    let position: MenuPosition
    if (options.anchor) {
      position = getMeasurementsFromAnchor(
        rect,
        element,
        options.preferredAlign,
      )
    } else {
      position = options.position
    }

    positionMenu(menuEl, {
      ...rect,
      ...position,
    })

    animateFade(menuEl, false, {
      duration: 45,
      easing: 'linear',
    })

    const a = menuEl.animate(
      { transform: ['scale(.8)', 'none'] },
      {
        duration: 150,
        easing: EASING_INCOMING_80,
      },
    )
    a.finished.then(() => {
      menuEl.focus()
    })
  }

  const closeMenu = () => {
    // If menu is already closed do nothing.
    // This can happen when keydown event occurs first
    // and then focusout fires after.
    if (!state.isOpen) {
      return
    }

    animateFade(menuEl, true, {
      duration: 100,
      easing: 'linear',
    }).finished.then(() => {
      setState('isOpen', false)
      if (elementToReturnFocusTo) {
        elementToReturnFocusTo.focus()
      }
    })
  }

  window.addEventListener('contextmenu', (e) => {
    const el = e.composedPath()[0]

    // Allow standard browser context menu on input[type='text'] elements,
    // because creating custom menu for copy & paste with working text selection
    // is hard and buggy.
    if (el instanceof HTMLInputElement && el.type === 'text') {
      return
    }

    // Don't allow standard menu otherwise.
    e.preventDefault()
  })

  let focusTrapEl!: FocusTrap
  const onFocusOutHandler = () => {
    queueMicrotask(() => {
      if (!doesElementContainFocus(focusTrapEl)) {
        closeMenu()
      }
    })
  }

  const onKeyDownHandler = (e: KeyboardEvent) => {
    if (e.code === KeyboardCode.ESC) {
      e.preventDefault()
      e.stopPropagation()
      closeMenu()
    }
  }

  return (
    <MenuContext.Provider value={{ show }}>
      <Show when={state.isOpen}>
        <div class={styles.overlay} />
        <focus-trap
          ref={focusTrapEl}
          onKeyDown={onKeyDownHandler}
          onFocusOut={onFocusOutHandler}
        >
          <Show
            when={!state.component}
            fallback={
              <div ref={menuEl} class={styles.menu} tabIndex='-1'>
                {state.component as JSXElement}
              </div>
            }
          >
            <List ref={menuEl} class={styles.menu} role-description='Menu'>
              <For each={state.items}>
                {(item) => (
                  <div
                    role='menuitem'
                    class={clx(
                      styles.menuItem,
                      item.selected && styles.selected,
                    )}
                    onClick={() => {
                      item.action()
                      closeMenu()
                    }}
                  >
                    {item.name}
                  </div>
                )}
              </For>
            </List>
          </Show>
        </focus-trap>
      </Show>

      {props.children}
    </MenuContext.Provider>
  )
}
