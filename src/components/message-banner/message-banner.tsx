import { NavLink } from '@rturnq/solid-router'
import { Component, Show } from 'solid-js'
import { clx } from '../../utils'
import * as styles from './message-banner.css'

export interface MessageBannerProps {
  title?: string
  message?: string
  className?: string
  button?: {
    title: string
    href?: string
    onClick?: (e: MouseEvent) => void
  }
}

const BannerButton = (props: NonNullable<MessageBannerProps['button']>) =>
  props.href ? (
    <NavLink className={styles.button} href={props.href}>
      {props.title}
    </NavLink>
  ) : (
    <button className={styles.button} onClick={props.onClick}>
      {props.title}
    </button>
  )

export const MessageBanner: Component<MessageBannerProps> = (props) => (
  <div className={clx(styles.messageBanner, props.className)}>
    <Show when={props.title}>
      <h1 className={styles.title}>{props.title}</h1>
    </Show>
    <Show when={props.message}>
      <div>{props.message}</div>
    </Show>
    <Show when={props.button}>{BannerButton}</Show>
  </div>
)
