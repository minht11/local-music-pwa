import { ScrollTargetContext } from '@minht11/solid-virtual-container'
import { Component, JSX, Show } from 'solid-js'
import { clx } from '../../utils'
import { Toolbar, ToolbarProps } from '../toolbar/toolbar'
import * as styles from './app-scroll-container.css'

interface AppScrollContainerProps {
  header?: JSX.Element
  headerProps?: ToolbarProps | false
  ref?: HTMLDivElement
  classNames?: {
    container?: string | false
    scrollContainer?: string | false
  }
}

export const AppScrollContainer: Component<AppScrollContainerProps> = (
  props,
) => {
  let scrollTargetEl!: HTMLDivElement

  return (
    <div
      className={clx(styles.container, props.classNames?.container)}
      ref={props.ref}
    >
      <Show when={props.headerProps}>
        {(headerProps) => <Toolbar {...headerProps} />}
      </Show>
      {props.header}

      <div
        className={clx(
          styles.scrollContainer,
          props.classNames?.scrollContainer,
        )}
        ref={scrollTargetEl}
      >
        <ScrollTargetContext.Provider value={{ scrollTarget: scrollTargetEl }}>
          {props.children}
        </ScrollTargetContext.Provider>
      </div>
    </div>
  )
}
