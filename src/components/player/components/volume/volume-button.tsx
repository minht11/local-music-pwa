import { Component } from 'solid-js'
import { IconButton } from '../../../icon-button/icon-button'
import { usePlayerStore } from '../../../../stores/stores'
import * as styles from './volume.css'

interface VolumeButtonProps {
  title: string
  onClick: (e: MouseEvent) => void
}

export const VolumeButton: Component<VolumeButtonProps> = (props) => {
  const [playerState] = usePlayerStore()

  const volumeStateClassName = () => {
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
        className={`${styles.volumeIcon} ${volumeStateClassName()}`}
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <clipPath id='a-volume-mask'>
          <rect
            className={styles.volume45}
            x='15'
            y='0'
            width='7'
            height='24'
            fill='white'
          />
          <rect
            className={`${styles.volume45} ${styles.volumeClipTop}`}
            x='11'
            y='0'
            width='4'
            height='24'
            fill='white'
          />
          <rect
            className={styles.volume45}
            x='0'
            y='0'
            width='11'
            height='24'
            fill='white'
          />
        </clipPath>
        <clipPath id='a-volume-cross-mask'>
          <rect
            className={`${styles.volume45} ${styles.volumeClipCross}`}
            x='11'
            y='0'
            width='2'
            height='24'
            fill='white'
          />
        </clipPath>
        <g clip-path='url(#a-volume-mask)'>
          <path d='m 3,9 v 6 h 4 l 5,5 V 4 L 7,9 Z m 13.5,3 c 0,-1.77 -1,-3.29 -2.5,-4.03 V 16 c 1.5,-0.71 2.5,-2.24 2.5,-4' />
          <path
            className={styles.volumeWaveHigh}
            d='M 14,3.2304688 V 5.2890625 C 16.89,6.1490625 19,8.83 19,12 c 0,3.17 -2.11,5.850938 -5,6.710938 v 2.058593 C 18.01,19.859531 21,16.28 21,12 21,7.72 18.01,4.1404688 14,3.2304688 Z'
          />
        </g>
        <g clip-path='url(#a-volume-cross-mask)'>
          <rect
            className={styles.volume45}
            x='11'
            y='0'
            width='2'
            height='24'
          />
        </g>
      </svg>
    </IconButton>
  )
}
