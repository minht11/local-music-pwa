import { JSXElement } from 'solid-js'
import { usePlayerStore } from '../../../stores/stores'
import { clx } from '../../../utils'
import { MusicImage } from '../../music-image/music-image'
import * as styles from './artwork.css'

export interface ArtworkProps {
  className?: string
}

export const Artwork = (props: ArtworkProps): JSXElement => {
  const [playerState] = usePlayerStore()

  return (
    <MusicImage
      item={playerState.activeTrack}
      className={clx(props.className, styles.artwork)}
    />
  )
}
