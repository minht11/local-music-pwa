import { PUBLIC_GOAT_COUNTER_URL } from '$env/static/public'

// Minimal GoatCounter client. Replaces the external https://gc.zgo.at/count.js
// script: we only ever call `count()` with an explicit path, so the rest of the
// upstream script (auto pageview, event binding, visitor counter, callbacks) is
// dead weight. Logic here mirrors count.js so behaviour on the wire is identical.
// https://github.com/arp242/goatcounter/blob/main/public/count.v5.js

interface CountOptions {
	path: string
	title?: string
	event?: boolean
}

const ENDPOINT = PUBLIC_GOAT_COUNTER_URL ? `${PUBLIC_GOAT_COUNTER_URL}/count` : undefined

const LOCALHOST_RE =
	/(localhost$|^127\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\.|^0\.0\.0\.0$)/

// Detect headless browsers / automation. GoatCounter does additional bot
// filtering server-side; these checks cover only what's detectable client-side.
const isBot = (): number => {
	if ('callPhantom' in window || '_phantom' in window || 'phantom' in window) {
		return 150
	}
	if ('__nightmare' in window) {
		return 151
	}
	if (
		'__selenium_unwrapped' in document ||
		'__webdriver_evaluate' in document ||
		'__driver_evaluate' in document
	) {
		return 152
	}
	if (navigator.webdriver) {
		return 153
	}
	return 0
}

// Reasons not to count a hit (mirrors count.js `filter()`). Set
// `localStorage.skipgc = 't'` in a browser to exclude your own visits.
const filterReason = (): string | undefined => {
	// 'prerender' is no longer in the DocumentVisibilityState type but can still
	// be reported by browsers, so compare as a plain string.
	if ((document.visibilityState as string) === 'prerender') {
		return 'prerender'
	}
	if (location !== parent.location) {
		return 'frame'
	}
	if (LOCALHOST_RE.test(location.hostname)) {
		return 'localhost'
	}
	if (location.protocol === 'file:') {
		return 'localfile'
	}
	try {
		if (localStorage.getItem('skipgc') === 't') {
			return 'skipgc'
		}
	} catch {
		// Accessing localStorage can throw in restricted contexts; ignore.
	}

	if (location.origin.endsWith('netlify.app')) {
		return 'preview'
	}

	return undefined
}

const buildUrl = ({ path, title, event }: CountOptions): string | undefined => {
	if (!ENDPOINT) {
		return undefined
	}

	const params = new URLSearchParams()
	// GoatCounter omits empty values, so only append what we actually have.
	params.set('p', path || location.pathname + location.search || '/')
	const resolvedTitle = title || document.title
	if (resolvedTitle) {
		params.set('t', resolvedTitle)
	}
	if (document.referrer) {
		params.set('r', document.referrer)
	}
	if (event) {
		params.set('e', 'true')
	}
	params.set('s', String(window.screen.width))
	const bot = isBot()
	if (bot) {
		params.set('b', String(bot))
	}
	if (location.search) {
		params.set('q', location.search)
	}
	// Browsers don't always respect Cache-Control.
	params.set('rnd', Math.random().toString(36).slice(2, 7))

	return `${ENDPOINT}?${params}`
}

let warningLogged = false

const count = (options: CountOptions): void => {
	const reason = filterReason()
	if (reason) {
		if (!warningLogged) {
			console.warn('[ANALYTICS] not tracking because:', reason)
			warningLogged = true
		}
		return
	}

	const url = buildUrl(options)
	if (!url) {
		return
	}

	if (navigator.sendBeacon(url)) {
		return
	}

	// sendBeacon can fail (e.g. blocked by CSP); fall back to an image request.
	const img = document.createElement('img')
	img.src = url
	img.setAttribute('alt', '')
	img.setAttribute('aria-hidden', 'true')
	img.style.position = 'absolute'
	img.style.bottom = '0'
	img.style.width = '1px'
	img.style.height = '1px'
	img.loading = 'eager'
	img.addEventListener('load', () => {
		img.remove()
	})
	img.addEventListener('error', () => {
		img.remove()
	})
	document.body.appendChild(img)
}

export const trackPageView = (path: string): void => {
	count({ path })
}

export const trackEvent = (path: string, title?: string): void => {
	count({ path, title, event: true })
}
