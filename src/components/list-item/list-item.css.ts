import { createVar, fallbackVar, style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles, vars } from '../../styles/styles.css'

export const { textEclipse } = sharedStyles

export const trailingSizeVar = createVar()

export const selected = style({
  backgroundColor: vars.colors.surfaceVariant,
  color: vars.colors.onSurfaceVariant,
})

export const listItem = style([
  sharedStyles.listItem,
  sprinkles({
    color: 'onSurfaceVariant',
    typography: 'bodyMedium',
    radius: '12px',
    gap: '8px',
  }),
  style({
    display: 'grid',
    gridTemplateRows: '1fr',
    gridTemplateColumns: `auto 1.5fr ${fallbackVar(
      trailingSizeVar,
      '1fr',
    )} 44px`,
    gridTemplateAreas: `
      'icon content trailing menu'
    `,
  }),
])

export const icon = style({
  display: 'flex',
  marginRight: '8px',
  gridArea: 'icon',
})

export const textContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gridArea: 'content',
  overflow: 'hidden',
})

export const mainText = style([
  textEclipse,
  sprinkles({
    typography: 'bodyLarge',
    color: 'onSurface',
  }),
  style({
    selectors: {
      [`${selected} &`]: {
        color: vars.colors.primary,
      },
    },
  }),
])

export const trailing = style({
  gridArea: 'trailing',
  display: 'flex',
  overflow: 'hidden',
  justifyContent: 'space-between',
  gap: '8px',
})

export const menu = style({
  gridArea: 'menu',
})
