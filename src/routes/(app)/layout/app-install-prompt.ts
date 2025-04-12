export const setupAppInstallPromptListeners = () => {
	const main = useMainStore()

    console.log('setupAppInstallPromptListeners', main.appInstallPromptEvent)
	window.addEventListener('appinstalled', () => {
		main.appInstallPromptEvent = null
	})

	window.addEventListener('beforeinstallprompt', (e) => {
        console.log('beforeinstallprompt', e)
		e.preventDefault()
		main.appInstallPromptEvent = e
	})
}
