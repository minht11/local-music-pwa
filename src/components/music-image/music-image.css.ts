import { composeStyles, style } from '@vanilla-extract/css'
import { atoms, vars } from '../../styles/styles.css'

export const musicImage = composeStyles(
  atoms({
    border: 'small',
  }),
  style({
    backgroundColor: `hsla(${vars.colors.contentHsl}, 12%)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundClip: 'content-box',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  }),
)

export const aspectRatio = style({
  aspectRatio: '1/1',
  // // Position relative can be expensive,
  // // especially when used on a lot of elements.
  // position: 'static',
})

export const legacyAspectImg = style({
  height: '100%',
})

export const musicIcon = composeStyles(
  atoms({
    color: 'content2',
  }),
  style({
    padding: '10%',
    width: '100%',
    height: '100%',
    position: 'absolute',
  }),
)
