import { JSXElement } from 'solid-js'
import { IconButton } from '../../icon-button/icon-button'
import { usePlayerStore } from '../../../stores/stores'
import * as styles from './volume.css'

interface VolumeButtonProps {
  title: string
  onClick: (e: MouseEvent) => void
}

export const VolumeButton = (props: VolumeButtonProps): JSXElement => {
  const [playerState] = usePlayerStore()

  const volumeStateclass = () => {
    const { volume } = playerState

    let volumeIcon = styles.volumeLow
    if (volume === 0 || playerState.isMuted) {
      volumeIcon = styles.volumeOff
    } else if (volume > 50) {
      volumeIcon = ''
    }
    return volumeIcon
  }

  return (
    <IconButton title={props.title} onClick={props.onClick}>
      <svg
        class={`${styles.volumeIcon} ${volumeStateclass()}`}
        viewBox='0 0 24 24'
      >
        <mask id='a-volume-mask'>
          <rect width='24' height='24' fill='white' />
          <g class={styles.volume45}>
            <rect
              class={styles.volumeCrossLine}
              fill='black'
              x='13'
              y='0'
              width='2'
              height='24'
            />
          </g>
        </mask>
        <g mask='url(#a-volume-mask)'>
          <path d='m 3,9 v 6 h 4 l 5,5 V 4 L 7,9 Z m 13.5,3 c 0,-1.77 -1,-3.29 -2.5,-4.03 V 16 c 1.5,-0.71 2.5,-2.24 2.5,-4' />
          <path
            class={styles.volumeWaveHigh}
            d='M 14,3.2304688 V 5.2890625 C 16.89,6.1490625 19,8.83 19,12 c 0,3.17 -2.11,5.850938 -5,6.710938 v 2.058593 C 18.01,19.859531 21,16.28 21,12 21,7.72 18.01,4.1404688 14,3.2304688 Z'
          />
          <g class={styles.volume45}>
            <rect
              class={styles.volumeCrossLine}
              x='11'
              y='0'
              width='2'
              height='24'
            />
          </g>
        </g>
      </svg>
    </IconButton>
  )
}
