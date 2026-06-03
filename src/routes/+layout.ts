import '../app.css'
import { browser } from '$app/environment'
import { registerServiceWorker } from '$lib/helpers/register-sw'

export const ssr = false
export const prerender = false

if (browser) {
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
