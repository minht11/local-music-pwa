import { Component, Show } from 'solid-js'
import { clx } from '../../../utils'
import { usePlayerStore } from '../../../stores/stores'
import * as styles from './info.css'

interface InfoProps {
  bigTitle?: boolean
  hideFavoriteBtn?: boolean
  className?: string | false
}

export const Info: Component<InfoProps> = (props) => {
  const [playerState] = usePlayerStore()

  const aTrack = () => playerState.activeTrack

  return (
    <div className={clx(styles.infoContainer, props.className)}>
      <Show when={aTrack()}>
        <div className={styles.info}>
          <div
            className={props.bigTitle ? styles.titleBig : styles.titleRegular}
          >
            {aTrack()?.name || 'Unknown'}
          </div>
          <div className={styles.secondaryInfoText}>
            {aTrack()?.artists.join(', ')}
          </div>
        </div>
      </Show>
    </div>
  )
}
