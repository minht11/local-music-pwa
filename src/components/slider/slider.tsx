import { setElementVar } from '@vanilla-extract/dynamic'
import { Component, createEffect, JSX, mergeProps } from 'solid-js'
import { clx } from '../../utils'
import * as styles from './slider.css'

export type SliderProps = Omit<JSX.HTMLAttributes<HTMLInputElement>, 'ref'> & {
  disabled?: boolean
  min?: number
  max?: number
  value: number
}

export const Slider: Component<SliderProps> = (props) => {
  const mergedProps = mergeProps(
    {
      min: 0,
      max: 100,
    },
    props,
  )

  let inputEl!: HTMLInputElement

  createEffect(() => {
    const percentage = (mergedProps.value * 100) / mergedProps.max
    const percentageSafe = Number.isFinite(percentage) ? percentage : 0

    setElementVar(inputEl, styles.sliderValueVar, `${percentageSafe}%`)
  })

  return (
    <input
      {...mergedProps}
      ref={inputEl}
      type='range'
      className={clx(styles.slider, props.className)}
    />
  )
}
