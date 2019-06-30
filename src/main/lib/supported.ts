export const isWebAnimationsSupported = 'animate' in document.body

export const isPaintWorkletSupported = 'CSS' in window && 'paintWorklet' in CSS

export const isResizeObserverSupported = 'ResizeObserver' in window

export const isHTMLDialogElementSupported = 'HTMLDialogElement' in window

export const isMediaSessionSupported = 'mediaSession' in navigator
