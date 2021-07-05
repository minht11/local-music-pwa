/* eslint-disable */

export const loadPolyfills = async () => {
  const polyfills: Promise<unknown>[] = []

  // Safari.
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = (cb: (params: IdleDeadline) => void) =>
      window.setTimeout(() => {
        const start = Date.now()
        cb({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        })
      }, 1)
  }

  return Promise.all(polyfills)
}
