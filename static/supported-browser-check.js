// IMPORTANT. This file must be imported as separate entry point
// and it cannot use any modern JS syntax.

var isSupportedBrowser =
	'noModule' in HTMLScriptElement.prototype &&
	navigator.locks &&
	'timeout' in AbortSignal &&
	CSS &&
	CSS.supports('color: color-mix(in oklab, black, black)') &&
	// Container queries
	'container' in document.documentElement.style &&
	navigator.serviceWorker

if (!isSupportedBrowser) {
	document.getElementById('unsupported-browser').removeAttribute('hidden')
	document.getElementById('app').style.display = 'none'
}
