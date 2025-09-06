import '../app.css'
import { browser } from '$app/environment'
import { snackbar } from '$lib/components/snackbar/snackbar'
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
