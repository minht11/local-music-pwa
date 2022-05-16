import { Show, VoidComponent } from 'solid-js'
import { clx } from '../../../utils'
import { usePlayerStore } from '../../../stores/stores'
import * as styles from './info.css'

interface InfoProps {
  bigTitle?: boolean
  hideFavoriteBtn?: boolean
  class?: string | false
}

export const Info: VoidComponent<InfoProps> = (props) => {
  const [playerState] = usePlayerStore()

  const aTrack = () => playerState.activeTrack

  return (
    <div class={clx(styles.infoContainer, props.class)}>
      <Show when={aTrack()}>
        <div class={styles.info}>
          <div class={props.bigTitle ? styles.titleBig : styles.titleRegular}>
            {aTrack()?.name || 'Unknown'}
          </div>
          <div class={styles.secondaryInfoText}>
            {aTrack()?.artists.join(', ')}
          </div>
        </div>
      </Show>
    </div>
  )
}
