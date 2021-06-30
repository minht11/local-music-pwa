const body1 = {
  fontSize: '16px',
  letterSpacing: '0.5px',
  fontWeight: 400,
} as const

const body2 = {
  fontSize: '14px',
  letterSpacing: '0.25px',
  fontWeight: 400,
} as const

const button = {
  fontSize: '14px',
  letterSpacing: '1.25px',
  fontWeight: 500,
} as const

const caption = {
  fontSize: '12px',
  letterSpacing: '0.4px',
  fontWeight: 400,
} as const

const headline1 = {
  fontSize: '18px',
  letterSpacing: '0.15px',
  fontWeight: 500,
} as const

const headline2 = {
  fontSize: '24px',
  letterSpacing: '0.15px',
  fontWeight: 400,
} as const

const headline3 = {
  fontSize: '36px',
  letterSpacing: '0.15px',
  fontWeight: 400,
} as const

const subheader = {
  fontSize: '12px',
  letterSpacing: '0.4px',
  fontWeight: 500,
} as const

const styles = {
  body1,
  body2,
  button,
  caption,
  headline1,
  headline2,
  headline3,
  subheader,
} as const

type Styles = typeof styles
type StylesKeys = keyof Styles

const styleEntries = Object.entries(styles)

type SplitStyles<T> = {
  [key in StylesKeys]: T
}

export const fontSizes = Object.fromEntries(
  styleEntries.map(([name, value]) => [name, value.fontSize]),
) as SplitStyles<string>

export const letterSpacing = Object.fromEntries(
  styleEntries.map(([name, value]) => [name, value.letterSpacing]),
) as SplitStyles<string>

export const fontWeight = Object.fromEntries(
  styleEntries.map(([name, value]) => [name, value.fontWeight]),
) as SplitStyles<number>
