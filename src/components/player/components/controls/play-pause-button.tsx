import { Component } from 'solid-js'
import { IconButton } from '../../../icon-button/icon-button'
import { clx } from '../../../../utils'
import { usePlayerStore } from '../../../../stores/stores'
import * as styles from './controls.css'

interface PlayPauseButtonProps {
  isMain?: boolean
}

export const PlayPauseButton: Component<PlayPauseButtonProps> = (props) => {
  const [playerState, playerActions] = usePlayerStore()

  return (
    <IconButton
      title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      disabled={!playerState.activeTrack}
      onClick={() => playerActions.playPause()}
      className={clx(props.isMain && styles.playPauseButtonMain)}
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
    </IconButton>
  )
}
