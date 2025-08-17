export const setupAppInstallPromptListeners = () => {
	const main = useMainStore()

	window.addEventListener('appinstalled', () => {
		main.appInstallPromptEvent = null
	})

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault()
		main.appInstallPromptEvent = e
	})
}
