import { createVar, assignVars, createGlobalTheme } from '@vanilla-extract/css'

const root = 'html'

export const hueVar = createVar()

const darkColorHslVars = createGlobalTheme(root, {
  primaryHsl: `${hueVar}, 80%, 78%`,
  primaryContentHsl: `${hueVar}, 8%, 10%`,
  contentHsl: `${hueVar}, 70%, 97%`,
})

const lightColorHslTheme = assignVars(darkColorHslVars, {
  primaryHsl: `${hueVar}, 80%, 42%`,
  primaryContentHsl: `${hueVar}, 22%, 98%`,
  contentHsl: `${hueVar}, 82%, 10%`,
})

const colorHslVars = darkColorHslVars

const darkSurfaceVars = createGlobalTheme(root, {
  surface0: `hsl(${hueVar}, 2%, 12%)`,
  surface1: `hsl(${hueVar}, 4%, 16%)`,
  surface2: `hsl(${hueVar}, 8%, 22%)`,
  surface3: `hsl(${hueVar}, 7%, 34%)`,
  surface4: `hsl(${hueVar}, 2%, 24%)`,
  surface5: `hsl(${hueVar}, 10%, 18%)`,
})

const lightSurfaceTheme = assignVars(darkSurfaceVars, {
  surface0: `hsl(${hueVar}, 24%, 100%)`,
  surface1: `hsl(${hueVar}, 22%, 96%)`,
  surface2: `hsl(${hueVar}, 58%, 94%)`,
  surface3: `hsl(${hueVar}, 64%, 98%)`,
  surface4: `hsl(${hueVar}, 30%, 94%)`,
  surface5: `hsl(${hueVar}, 64%, 98%)`,
})

export const surfaceVars = darkSurfaceVars

const otherDynamicColorVars = createGlobalTheme(root, {
  content2: `hsla(${colorHslVars.contentHsl}, 54%)`,
})

const lightOtherDynamicColorTheme = assignVars(otherDynamicColorVars, {
  content2: `hsla(${colorHslVars.contentHsl}, 64%)`,
})

export const lightTheme = {
  ...lightColorHslTheme,
  ...lightSurfaceTheme,
  ...lightOtherDynamicColorTheme,
}

const staticColorVars = createGlobalTheme(root, {
  primary: `hsl(${colorHslVars.primaryHsl})`,
  primaryContent: `hsl(${colorHslVars.primaryContentHsl})`,
  content1: `hsla(${colorHslVars.contentHsl}, 100%)`,
  scrim: 'hsla(0deg, 0%, 0%, 20%)',
  scrollBar: `hsla(${colorHslVars.contentHsl}, 20%)`,
})

const colors = {
  hue: hueVar,
  ...colorHslVars,
  ...surfaceVars,
  ...otherDynamicColorVars,
  ...staticColorVars,
}

const space = {
  none: 0,
  small: '4px',
  medium: '8px',
  large: '16px',
  veryLarge: '24px',
}

export const vars = {
  colors,
  sizes: {
    maxContentWidth: '2144px',
    toolbarHeight: '56px',
  },
  borders: {
    primary_1: `1px solid ${colors.primary}`,
    regular_1: `1px solid hsla(${colors.contentHsl}, 20%)`,
  },
  // These are not actually variables but just static values.
  static: {
    padding: space,
    radius: space,
    gap: space,
  },
}
