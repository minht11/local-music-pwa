import { Component } from 'solid-js'
import { IconButton } from '../../../icon-button/icon-button'
import { animateIcon, clx } from '../../../../utils'
import { PlayNextButton, PlayPreviousButton } from './play-next-prev-buttons'
import { PlayPauseButton } from './play-pause-button'
import { usePlayerStore } from '../../../../stores/stores'
import { RepeatState } from '../../../../stores/player/create-player-store'
import * as styles from './controls.css'

const REPEAT_TITLES = [
  'Enable repeat',
  'Enable repeat once',
  'Disable repeat',
] as const

export const Controls: Component = () => {
  const [playerState, playerActions] = usePlayerStore()

  const onShuffleClickHandler = (e: MouseEvent) => {
    animateIcon(e, styles.SHUFFLE_ANI_DURATION_TOTAL, styles.animating)
    playerActions.toggleShuffle()
  }

  const onRepeatClickHandler = (e: MouseEvent) => {
    animateIcon(e, 325, styles.animating)
    playerActions.toggleRepeat()
  }

  return (
    <div className={styles.controls}>
      <IconButton
        title={playerState.shuffle ? 'Disable shuffle' : 'Enable shuffle'}
        onClick={onShuffleClickHandler}
      >
        <div
          className={clx(
            styles.shuffleIcon,
            playerState.shuffle && styles.enabled,
          )}
        >
          <div className={styles.shuffleArrow} />
          <div className={styles.shuffleIntersectionClip}>
            <div className={styles.shuffleArrowFlipped} />
          </div>
        </div>
      </IconButton>
      <PlayPreviousButton />
      <PlayPauseButton isMain />
      <PlayNextButton />
      <IconButton
        title={REPEAT_TITLES[playerState.repeat]}
        onClick={onRepeatClickHandler}
      >
        <svg
          className={clx(
            styles.repeatIcon,
            playerState.repeat !== RepeatState.repeatOff && styles.enabled,
          )}
          viewBox='0 0 24 24'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            className={styles.repeatPath}
            d='M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
          />
          <path
            className={clx(
              styles.repeatPathOne,
              playerState.repeat === RepeatState.repeatOnce &&
                styles.repeatPathOneVisible,
            )}
            d='M 13,15 V 9.0000002 H 12 L 10,10 v 1 h 1.5 v 4 z'
          />
        </svg>
      </IconButton>
    </div>
  )
}
