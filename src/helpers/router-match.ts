import { useLocation, useMatch } from 'solid-app-router'
import { createMemo, untrack } from 'solid-js'

type ValueMapper<T> = T extends () => infer R ? R : T

export const useMapRouteToValue = <T>(
  mapping: Record<string, () => ValueMapper<T>>,
  defaultValue?: T,
) => {
  const matcherEntries = Object.entries(mapping).map(
    ([path, valueFn]) => [useMatch(() => path), valueFn] as const,
  )

  const location = useLocation()

  const valueFnMemo = createMemo(() => {
    // eslint-disable-next-line no-unused-expressions
    location.pathname

    const match = untrack(() => matcherEntries.find(([matcher]) => matcher()))

    if (!match) {
      return () => defaultValue
    }

    return match[1]
  })

  return createMemo(() => valueFnMemo()())
}
