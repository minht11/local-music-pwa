import { style } from '@vanilla-extract/css'
import { vars } from '../../../styles/styles.css'

export const queueContainer = style({
  width: '100%',
  height: '100%',
  position: 'absolute',
})

export const header = style({
  background: `hsla(${vars.colors.contentHsl}, 5%)`,
})
