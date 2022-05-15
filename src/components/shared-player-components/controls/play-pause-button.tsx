import { JSXElement } from 'solid-js'
import { clx } from '../../../utils'
import { usePlayerStore } from '../../../stores/stores'
import * as styles from './controls.css'

export const PlayPauseButton = (): JSXElement => {
  const [playerState, playerActions] = usePlayerStore()

  return (
    <button
      title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      disabled={!playerState.activeTrack}
      onClick={() => playerActions.playPause()}
      class={styles.playPauseButton}
    >
      <div
        class={clx(
          styles.playPauseIcon,
          playerState.isPlaying && styles.playing,
        )}
      >
        <div class={styles.playPauseIconBar} />
        <div class={clx(styles.playPauseIconBar, styles.flippedY)} />
      </div>
    </button>
  )
}
