const headlineMedium = {
  fontSize: '28px',
  lineHeight: '36px',
  letterSpacing: '0',
  fontWeight: 400,
}

const headlineSmall = {
  fontSize: '24px',
  lineHeight: '32px',
  letterSpacing: '0',
  fontWeight: 400,
}

const titleLarge = {
  fontSize: '22px',
  lineHeight: '28px',
  letterSpacing: '0',
  fontWeight: 500,
} as const

const titleMedium = {
  fontSize: '16px',
  lineHeight: '124px',
  letterSpacing: '0.15px',
  fontWeight: 500,
} as const

const titleSmall = {
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '0.1px',
  fontWeight: 500,
} as const

const labelLarge = {
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '0.1px',
  fontWeight: 500,
} as const

const labelMedium = {
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0.5px',
  fontWeight: 500,
} as const

const labelSmall = {
  fontSize: '11px',
  lineHeight: '16px',
  letterSpacing: '0.5px',
  fontWeight: 500,
} as const

const bodyLarge = {
  fontSize: '16px',
  lineHeight: '24px',
  letterSpacing: '0.15px',
  fontWeight: 400,
} as const

const bodyMedium = {
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '0.25px',
  fontWeight: 400,
} as const

const bodySmall = {
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0.4px',
  fontWeight: 400,
} as const

const styles = {
  headlineMedium,
  headlineSmall,
  titleLarge,
  titleMedium,
  titleSmall,
  labelLarge,
  labelMedium,
  labelSmall,
  bodyLarge,
  bodyMedium,
  bodySmall,
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
