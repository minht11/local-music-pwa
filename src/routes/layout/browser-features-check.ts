const supportsCssColorMix = CSS.supports('color: color-mix(in oklab, black, black)')
const supportsContainerQueries = 'container' in document.documentElement.style

// TODO. Use it to conditionally load the app
export const IS_BROWSER_SUPPORTED: boolean =
	navigator.locks && 'timeout' in AbortSignal && supportsCssColorMix && supportsContainerQueries
