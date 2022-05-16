import { VoidComponent } from 'solid-js'
import { VolumeButton } from './volume-button'
import { Slider } from '../../slider/slider'
import { usePlayerStore } from '../../../stores/stores'
import * as styles from './volume.css'

export const VolumePanel: VoidComponent = () => {
  const [playerState, playerActions] = usePlayerStore()

  const onVolumeToggleClickHandler = () => {
    playerActions.toggleMute()
  }

  const onVolumeInputHandler = (e: InputEvent) => {
    const inputEl = e.target as HTMLInputElement
    const parsedValue = parseInt(inputEl.value, 10)
    // This is probably not needed, but it doen't hurt.
    const value = Number.isInteger(parsedValue) ? parsedValue : 100

    playerActions.setVolume(value)
  }

  return (
    <div class={styles.volumeControl}>
      <Slider
        aria-label='Volume slider'
        value={playerState.volume}
        onInput={onVolumeInputHandler}
        class={styles.volumeSlider}
      />
      <VolumeButton
        title={playerState.isMuted ? 'Unmute (m)' : 'Mute (m)'}
        onClick={onVolumeToggleClickHandler}
      />
    </div>
  )
}
