import { style, keyframes } from '@vanilla-extract/css'

// Spinner from https://codepen.io/mrrocks/pen/EiplA

const DURATION = '1.4s'
const OFFSET = 187

const rotateAni = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(270deg)' },
})

// TODO: Animating svg in chrome causes layout,
// while not performance critical because spinner
// in this app is used very rarely, but more performant
// solution could be found.
export const spinner = style({
  willChange: 'transform',
  width: '40px',
  height: '40px',
  animation: `${rotateAni} ${DURATION} linear infinite`,
  color: 'currentcolor',
})

const dashAni = keyframes({
  '0%': { strokeDashoffset: OFFSET },
  '50%': { strokeDashoffset: OFFSET / 4, transform: 'rotate(135deg)' },
  '100%': { strokeDashoffset: OFFSET, transform: 'rotate(450deg)' },
})

export const path = style({
  fill: 'none',
  strokeWidth: '6',
  strokeLinecap: 'round',
  strokeDasharray: OFFSET,
  strokeDashoffset: 0,
  transformOrigin: 'center',
  stroke: 'currentcolor',
  animation: `${dashAni} ${DURATION} ease-in-out infinite`,
})
