import { createEffect, JSX, JSXElement, mergeProps } from 'solid-js'
import { clx } from '../../utils'
import * as styles from './slider.css'

export type SliderProps = Omit<JSX.HTMLAttributes<HTMLInputElement>, 'ref'> & {
  disabled?: boolean
  min?: number
  max?: number
  value: number
}

export const Slider = (props: SliderProps): JSXElement => {
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

    inputEl.style.setProperty(styles.sliderValueVarName, `${percentageSafe}%`)
  })

  return (
    <input
      {...mergedProps}
      ref={inputEl}
      type='range'
      class={clx(styles.slider, props.class)}
    />
  )
}
