/* eslint-disable */

export const loadPolyfills = async () => {
  const polyfills: Promise<unknown>[] = []

  // Safari.
  if (!window.requestIdleCallback) {
    polyfills.push(
      // @ts-ignore
      import('requestidlecallback'),
    )
  }

  return Promise.all(polyfills)
}
