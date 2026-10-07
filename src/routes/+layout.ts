import '../app.css'
import { browser } from '$app/env'
import { registerServiceWorker } from '#lib/helpers/register-sw.ts'

export const ssr = false
export const prerender = false

if (browser) {
	void registerServiceWorker({
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
