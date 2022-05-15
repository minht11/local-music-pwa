import { JSXElement } from 'solid-js'
import { IconButton } from '../../icon-button/icon-button'
import { animateIcon, clx } from '../../../utils'
import { usePlayerStore } from '../../../stores/stores'
import * as styles from './controls.css'

export interface PlaySkipButtonProps {
  iconFlipped?: boolean
  title: string
  action: (actions: ReturnType<typeof usePlayerStore>[1]) => void
}

const PlaySkipButton = (props: PlaySkipButtonProps) => {
  const [playerState, playerActions] = usePlayerStore()

  const onPlayPreviousClickHandler = (e: MouseEvent) => {
    animateIcon(e, 200, styles.animating)
    props.action(playerActions)
  }

  return (
    <IconButton
      disabled={!playerState.trackIds.length}
      title={props.title}
      onClick={onPlayPreviousClickHandler}
    >
      {/*
        Safari incorrectly applies clip-path to the svg elements.
        https://bugs.webkit.org/show_bug.cgi?id=227704
        Add wrapper div to fix it.
      */}
      <div
        class={clx(styles.skipIconClip, props.iconFlipped && styles.flippedX)}
      >
        <svg class={styles.skipIcon} viewBox='0 0 24 24'>
          <path
            class={styles.skipBottom}
            d='M 6,18 14.5,12 6,6 M 8,9.86 11.03,12 8,14.14'
          />
          <path
            class={styles.skipTop}
            d='M 6,18 14.5,12 6,6 M 8,9.86 11.03,12 8,14.14'
          />
          <path d='M16,6L16,18L18,18L18,6L16,6Z' />
        </svg>
      </div>
    </IconButton>
  )
}

export const PlayPreviousButton = (): JSXElement => (
  <PlaySkipButton
    iconFlipped
    title='Play previous track (SHIFT+P)'
    action={(actions) => actions.playPreveousTrack()}
  />
)

export const PlayNextButton = (): JSXElement => (
  <PlaySkipButton
    title='Play next track (SHIFT+N)'
    action={(actions) => actions.playNextTrack()}
  />
)
