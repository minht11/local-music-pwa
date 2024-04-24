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
    
    const maxValue = 100 // value for normalizing
    // This is probably not needed, but it doen't hurt.
    const value = Number.isInteger(parsedValue) ? parsedValue : maxValue
    
    const k = 0.5 //value for adjusting the curve
    const normalizedValue = value / maxVolume;
    const powValue = maxVolume * Math.pow(normalizedValue, k)
    
    playerActions.setVolume(powValue)
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
