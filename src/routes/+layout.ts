import '../app.css'
import { getLocale } from 'i18n:runtime'
import { browser } from '$app/environment'
import { registerServiceWorker } from '$lib/helpers/register-sw'

export const ssr = false
export const prerender = false

if (browser) {
	document.documentElement.lang = getLocale()

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
