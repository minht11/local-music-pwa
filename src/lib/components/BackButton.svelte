<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { wait } from '$lib/helpers/utils/wait.ts'
	import IconButton from './IconButton.svelte'

	interface Props {
		class?: ClassValue
	}

	const { class: className }: Props = $props()

	const goHome = () => {
		void goto('/library/tracks')
	}

	const handleBackClick = () => {
		if (window.navigation !== undefined) {
			if (window.navigation.canGoBack) {
				window.navigation.back()
			} else {
				goHome()
			}

			return
		}

		const path = page.url.pathname
		window.history.back()
		// If there are no entries inside history back button
		// won't work and user will be stuck.
		// Example: user loads new tab going straight to /settings,
		// when app back button is pressed, nothing happens because
		// this is the first entry in history.
		// To prevent this check if URL changed, after short delay,
		// if it didn't back button most likely didn't do anything.
		void wait(50).then(() => {
			if (path === page.url.pathname) {
				goHome()
			}
		})
	}
</script>

<IconButton tooltip={m.goBack()} icon="backArrow" class={className} onclick={handleBackClick} />
