/* eslint-disable */

export const loadPolyfills = async () => {
  const polyfills: Promise<unknown>[] = []

  // Safari.
  if (!window.requestIdleCallback) {
    polyfills.push(
      // @ts-ignore
      import('requestIdleCallback'),
    )
  }

  return Promise.all(polyfills)
}
