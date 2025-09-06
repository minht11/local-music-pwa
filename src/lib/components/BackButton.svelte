<script lang="ts">
	import type { ClassValue } from 'clsx'
	import { goto } from '$app/navigation'
	import IconButton from './IconButton.svelte'
	import * as m from '$paraglide/messages.js'

	interface Props {
		class?: ClassValue
	}

	const { class: className }: Props = $props()

	const canGoBack = () => {
		if (window.navigation !== undefined) {
			return window.navigation.canGoBack
		}

		// This will not handle
		return window.history.length > 1
	}

	const handleBackClick = () => {
		if (canGoBack()) {
			window.history.back()
		} else {
			void goto('/')
		}
	}
</script>

<IconButton tooltip={m.goBack()} icon="backArrow" class={className} onclick={handleBackClick} />
