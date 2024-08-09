<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { wait } from '$lib/helpers/utils'
	import IconButton from './IconButton.svelte'

	interface Props {
		class?: string
	}

	const { class: className }: Props = $props()

	const handleBackClick = () => {
		if (window.navigation !== undefined) {
			if (window.navigation.canGoBack) {
				window.navigation.back()
			} else {
				goto('/')
			}

			return
		}

		const path = $page.url.pathname
		window.history.back()
		// If there are no entries inside history back button
		// won't work and user will be stuck.
		// Example: user loads new tab going straight to /settings,
		// when app back button is pressed, nothing happens because
		// this is the first entry in history.
		// To prevent this check if URL changed, after short delay,
		// if it didn't back button most likely didn't do anything.
		wait(50).then(() => {
			if (path === $page.url.pathname) {
				goto('/')
			}
		})
	}
</script>

<IconButton tooltip={m.goBack()} icon="backArrow" class={className} onclick={handleBackClick} />
