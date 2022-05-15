import { JSXElement } from 'solid-js'
import { MusicImage } from '~/components/music-image/music-image'
import { BaseMusicItem } from '~/types/types'
import * as styles from './info-card.css'

export interface InfoCardProps {
  actions?: JSXElement
  label?: string
  secondaryInfo: JSXElement
  item: BaseMusicItem
}

export const InfoCard = (props: InfoCardProps): JSXElement => (
  <section class={styles.content}>
    <MusicImage item={props.item} class={styles.musicImage} />
    <div class={styles.details}>
      <div class={styles.secondary}>{props.label}</div>
      <h1 class={styles.title}>{props.item.name}</h1>

      <div class={styles.secondary}>{props.secondaryInfo}</div>

      <div class={styles.actions}>{props.actions}</div>
    </div>
  </section>
)
