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
      className={styles.playPauseButton}
    >
      <div
        className={clx(
          styles.playPauseIcon,
          playerState.isPlaying && styles.playing,
        )}
      >
        <div className={styles.playPauseIconBar} />
        <div className={clx(styles.playPauseIconBar, styles.flippedY)} />
      </div>
    </button>
  )
}
