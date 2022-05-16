import { VoidComponent } from 'solid-js'
import { IconButton } from '../../icon-button/icon-button'
import { animateIcon, clx } from '../../../utils'
import { PlayNextButton, PlayPreviousButton } from './play-next-prev-buttons'
import { PlayPauseButton } from './play-pause-button'
import { usePlayerStore } from '../../../stores/stores'
import { RepeatState } from '../../../stores/player/create-player-store'
import * as styles from './controls.css'

const REPEAT_TITLES = {
  [RepeatState.OFF]: 'Enable repeat',
  [RepeatState.ALL]: 'Enable repeat once',
  [RepeatState.ONCE]: 'Disable repeat',
} as const

export const Controls: VoidComponent = () => {
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
    <div class={styles.controls}>
      <IconButton
        title={playerState.shuffle ? 'Disable shuffle' : 'Enable shuffle'}
        onClick={onShuffleClickHandler}
      >
        <div
          class={clx(styles.shuffleIcon, playerState.shuffle && styles.enabled)}
        >
          <div class={styles.shuffleArrow} />
          <div class={styles.shuffleIntersectionClip}>
            <div class={styles.shuffleArrowFlipped} />
          </div>
        </div>
        <div class={styles.enabledIndicator} />
      </IconButton>
      <PlayPreviousButton />
      <PlayPauseButton />
      <PlayNextButton />
      <IconButton
        title={REPEAT_TITLES[playerState.repeat]}
        onClick={onRepeatClickHandler}
      >
        <svg
          class={clx(
            styles.repeatIcon,
            playerState.repeat !== RepeatState.OFF && styles.enabled,
          )}
          viewBox='0 0 24 24'
        >
          <path
            class={styles.repeatPath}
            d='M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'
          />
          <path
            class={clx(
              styles.repeatPathOne,
              playerState.repeat === RepeatState.ONCE &&
                styles.repeatPathOneVisible,
            )}
            d='M 13,15 V 9.0000002 H 12 L 10,10 v 1 h 1.5 v 4 z'
          />
        </svg>
        <div class={styles.enabledIndicator} />
      </IconButton>
    </div>
  )
}
