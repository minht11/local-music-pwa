import { style, composeStyles, createVar } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../../styles/styles.css'

const FP_SECTION_WIDTH = '320px'

const fpMaxSectionWidthVar = createVar()
const fpArtworkWidthVar = createVar()

/*
  Vertical layout
  toolbar  toolbar  toolbar
  gap      artwork  gap
  gap      gap      gap
  gap      controls gap
  gap      gap      gap
*/
/*
  Horizontal layout
  toolbar  toolbar  gap   toolbar   gap
  gap      artwork  gap   controls  gap
  gap      gap      gap   gap       gap
*/

export const fpPane = composeStyles(
  atoms({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'medium',
  }),
  style({
    // TODO: this needs reworking, layout still breaks
    // under certain landscape sizes.
    vars: {
      /* First min: Max horizontal size */
      /* Second min: Max vertical size */
      [fpMaxSectionWidthVar]: `max(
        min(
          100vh - ${vars.sizes.toolbarHeight} - 16px,
          100vw - ${FP_SECTION_WIDTH} - 16px * 3
        ),
        min(
          100vh - 16px * 2 - ${vars.sizes.toolbarHeight} - 184px,
          100vw - 16px * 2
        )
      )
      `,
      [fpArtworkWidthVar]: `min(${fpMaxSectionWidthVar}, ${FP_SECTION_WIDTH})`,
      '--test-1': `min(
        100vh - ${vars.sizes.toolbarHeight} - 16px,
        100vw - ${FP_SECTION_WIDTH} - 16px * 3
      )`,
    },
    width: '100%',
    maxWidth: '320px',
    margin: '0 16px',
  }),
)

export const compact = style({
  maxWidth: '100%',
})

export const toolbar = composeStyles(
  sharedStyles.actions,
  style({
    justifyContent: 'space-between',
    width: '100%',
    height: vars.sizes.toolbarHeight,
  }),
)

export const title = atoms({
  typography: 'headline1',
})

export const toolbarSpacer = style({
  maxWidth: '44px',
  flex: 'auto 1 0',
})

export const content = composeStyles(
  atoms({
    display: 'flex',
    justifyContent: 'center',
    gap: 'large',
  }),
  style({
    flexWrap: 'wrap',
    alignContent: 'center',
    maxHeight: '624px',
    height: '100%',
    width: '100%',
  }),
)

export const artwork = composeStyles(
  atoms({
    radius: 'veryLarge',
  }),
  style({
    width: fpArtworkWidthVar,
    '@media': {
      '(max-width: 200px)': {
        display: 'none',
      },
    },
  }),
)

export const controls = style({
  maxWidth: fpArtworkWidthVar,
  width: '100%',
  alignItems: 'center',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gridTemplateRows: '56px 48px 72px 48px',
  gridTemplateAreas: `
    'info'
    'timeline'
    'controls'
    'sec-actions'
  `,
})

export const secondaryActions = style({
  gridArea: 'sec-actions',
  display: 'flex',
  justifyContent: 'space-between',
})

export const volumeMenuContent = atoms({
  paddingLeft: 'large',
})
