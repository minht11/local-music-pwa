import { NavLink } from 'solid-app-router'
import { Component } from 'solid-js'
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
    <NavLink className={styles.outlinedButton} href={props.href}>
      {props.title}
    </NavLink>
  ) : (
    <button className={styles.outlinedButton} onClick={props.onClick}>
      {props.title}
    </button>
  )

export const MessageBanner: Component<MessageBannerProps> = (props) => (
  <div className={clx(styles.messageBanner, props.className)}>
    {props.title && <h1 className={styles.title}>{props.title}</h1>}

    {props.message && <div>{props.message}</div>}

    {props.button && <BannerButton {...props.button} />}
  </div>
)
