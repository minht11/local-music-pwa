import '../app.css'
import { browser } from '$app/environment'
import { snackbar } from '$lib/components/snackbar/snackbar'
import { registerServiceWorker } from '$lib/helpers/register-sw'
import { baseLocale, isLocale, overwriteGetLocale, overwriteSetLocale } from '$paraglide/runtime'

export const ssr = false
export const prerender = false

const initLocale = () => {
	const savedLocale = localStorage.getItem('snae-locale')
	const locale = isLocale(savedLocale) ? savedLocale : baseLocale

	document.documentElement.lang = locale

	return locale
}

if (browser) {
	const locale = initLocale()
	overwriteGetLocale(() => locale)
	overwriteSetLocale((locale) => {
		localStorage.setItem('snae-locale', locale)
		window.location.reload()
	})

	registerServiceWorker({
		onNeedRefresh(update) {
			snackbar({
				id: 'app-update',
				message: m.appUpdateAvailable(),
				duration: false,
				controls: {
					label: m.reload(),
					action: update,
				},
			})
		},
	})
}
