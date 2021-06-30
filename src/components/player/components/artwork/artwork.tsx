import { Component } from 'solid-js'
import { usePlayerStore } from '../../../../stores/stores'
import { MusicImage, MusicImageProps } from '../../../music-image/music-image'

export const Artwork: Component<MusicImageProps> = (props) => {
  const [playerState] = usePlayerStore()

  return (
    <MusicImage
      ref={props.ref}
      item={playerState.activeTrack}
      className={props.className || ''}
    />
  )
}
