import { NavLink } from 'solid-app-router'
import { VoidComponent } from 'solid-js'
import { clx } from '../../utils'
import * as styles from './message-banner.css'

export interface MessageBannerProps {
  title?: string
  message?: string
  class?: string
  button?: {
    title: string
    href?: string
    onClick?: (e: MouseEvent) => void
  }
}

const BannerButton: VoidComponent<NonNullable<MessageBannerProps['button']>> = (
  props,
) =>
  props.href ? (
    <NavLink class={styles.outlinedButton} href={props.href}>
      {props.title}
    </NavLink>
  ) : (
    <button class={styles.outlinedButton} onClick={props.onClick}>
      {props.title}
    </button>
  )

export const MessageBanner: VoidComponent<MessageBannerProps> = (props) => (
  <div class={clx(styles.messageBanner, props.class)}>
    {props.title && <h1 class={styles.title}>{props.title}</h1>}

    {props.message && <div>{props.message}</div>}

    {props.button && <BannerButton {...props.button} />}
  </div>
)
