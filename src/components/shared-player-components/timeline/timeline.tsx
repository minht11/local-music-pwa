import { VoidComponent, createSignal } from 'solid-js'
import { usePlayerStore } from '../../../stores/stores'
import { formatTime } from '../../../utils'
import { KeyboardCode } from '../../../utils/key-codes'
import { Slider } from '../../slider/slider'
import * as styles from './timeline.css'

export const Timeline: VoidComponent = () => {
  const [playerState, playerActions] = usePlayerStore()

  const [isSeeking, setIsSeeking] = createSignal(false)
  const [localCurrentTime, setLocalCurrentTime] = createSignal(0)

  const changeCurrentTime = (time: number) => {
    if (Number.isFinite(time)) {
      playerActions.changeCurrentTime(time)
    }
  }

  const duration = () => playerState.duration
  const currentTime = () => playerState.currentTime

  const onPointerDownHandle = () => setIsSeeking(true)

  const onPointerUpHandle = () => {
    changeCurrentTime(localCurrentTime())
    setIsSeeking(false)
  }

  const onInputHandle = (e: InputEvent) => {
    const timelineEl = e.composedPath()[0] as HTMLInputElement

    const value = parseInt(timelineEl.value, 10) || 0
    const newTime = (value / 1000) * duration()
    setLocalCurrentTime(newTime)
  }

  const onKeyDownHandle = (e: KeyboardEvent) => {
    const { code } = e
    const isLeftArrow = code === KeyboardCode.ARROW_LEFT
    if (isLeftArrow || code === KeyboardCode.ARROW_RIGHT) {
      const time = currentTime() + (isLeftArrow ? -10 : 10)
      const adjustedTime = Math.max(Math.min(time, duration()), 0)
      changeCurrentTime(adjustedTime)
      e.preventDefault()
    }
  }

  const actualCurrentTime = () =>
    isSeeking() ? localCurrentTime() : currentTime()

  const inputValue = () => {
    const time = actualCurrentTime()

    return time ? (time * 1000) / duration() : 0
  }

  return (
    <div class={styles.timelineContainer}>
      <div class={styles.time}>{formatTime(actualCurrentTime())}</div>
      <Slider
        disabled={!playerState.activeTrack}
        aria-label='Audio timeline'
        max={1000}
        onPointerDown={onPointerDownHandle}
        onPointerUp={onPointerUpHandle}
        onInput={onInputHandle}
        onKeyDown={onKeyDownHandle}
        value={inputValue()}
      />
      <div class={styles.time}>{formatTime(duration())}</div>
    </div>
  )
}
