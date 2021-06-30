import { Component } from 'solid-js'
import { IconButton } from '../../../icon-button/icon-button'
import { animateIcon, clx } from '../../../../utils'
import { usePlayerStore } from '../../../../stores/stores'
import * as styles from './controls.css'

const PlayNextIcon = (props: { flipped?: boolean }) => (
  <svg
    className={clx(styles.skipIcon, props.flipped && styles.flippedX)}
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path className={styles.skipBottom} d='M6,18L14.500000,12L6,6L6,18Z' />
    <path className={styles.skipTop} d='M6,18L14.500000,12L6,6L6,18Z' />
    <path d='M16,6L16,18L18,18L18,6L16,6Z' />
  </svg>
)

export const PlayPreviousButton: Component = () => {
  const [playerState, playerActions] = usePlayerStore()

  const onPlayPreviousClickHandler = (e: MouseEvent) => {
    animateIcon(e, 200, styles.animating)
    playerActions.playPreveousTrack()
  }

  return (
    <IconButton
      disabled={!playerState.trackIds.length}
      title={'Play previous track (SHIFT+P)'}
      onClick={onPlayPreviousClickHandler}
    >
      <PlayNextIcon flipped />
    </IconButton>
  )
}

export const PlayNextButton: Component = () => {
  const [playerState, playerActions] = usePlayerStore()

  const onPlayNextClickHandler = (e: MouseEvent) => {
    animateIcon(e, 200, styles.animating)
    playerActions.playNextTrack()
  }

  return (
    <IconButton
      disabled={!playerState.trackIds.length}
      title={'Play next track (SHIFT+N)'}
      onClick={onPlayNextClickHandler}
    >
      <PlayNextIcon />
    </IconButton>
  )
}
