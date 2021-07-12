// IMPORTANT. This file cannot use any 'super modern'
// syntax or features because we want this file
// to load successfully even in old ES6 browsers,
// such as Legacy Edge.

const supportsOptionalChaining = () => {
  try {
    const a = { b: 1 }
    // eslint-disable-next-line no-unused-expressions
    a?.b
    return true
  } catch (err) {
    return false
  }
}

const featuresInWindow = [
  'IntersectionObserver',
  'ResizeObserver',
  'queueMicrotask',
  'PointerEvent', // 'Old' Safari
]

// Some of these checks will overlap, but that's okay,
// because we want to be sure that all of the main functions
// are supported by the browser.
const isSupportedBrowser =
  featuresInWindow.every((f) => f in window) &&
  CSS.supports('width', 'max(1px, 2px)') &&
  'finished' in Animation.prototype && // Chrome before v84
  supportsOptionalChaining()

if (!isSupportedBrowser) {
  // Show error message.
  document.documentElement.setAttribute('app-not-supported', '')
}

window.isSupportedBrowser = isSupportedBrowser

export type {}
