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
  <section className={styles.content}>
    <MusicImage item={props.item} className={styles.musicImage} />
    <div className={styles.details}>
      <div className={styles.secondary}>{props.label}</div>
      <h1 className={styles.title}>{props.item.name}</h1>

      <div className={styles.secondary}>{props.secondaryInfo}</div>

      <div className={styles.actions}>{props.actions}</div>
    </div>
  </section>
)
