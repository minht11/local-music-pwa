<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { page } from '$app/state'
	import { trackPageView } from '$lib/helpers/analytics.ts'
	import { MainStore } from '$lib/stores/main/store.svelte.ts'
	import { setMainStoreContext } from '$lib/stores/main/use-store.ts'
	import { setupAppViewTransitions } from '$lib/view-transitions.svelte.ts'

	const { children } = $props()

	const mainStore = setMainStoreContext(new MainStore())
	setupAppViewTransitions(() => mainStore.isReducedMotion)

	afterNavigate((nav) => {
		let page = nav.to?.route?.id ?? 'unknown'
		if (page === 'unknown' && nav.to?.url.pathname === '/') {
			page = '/(marketing)'
		}

		trackPageView(page)
	})

	$effect(() => {
		if (page.data.htmlOverflow === 'auto') {
			document.documentElement.style.overflowY = 'auto'
		} else {
			document.documentElement.style.overflowY = ''
		}
	})
</script>

{@render children()}
