<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { page } from '$app/state'
	import { MainStore } from '$lib/stores/main/store.svelte.ts'
	import { setMainStoreContext } from '$lib/stores/main/use-store.ts'
	import { setupAppViewTransitions } from '$lib/view-transitions.svelte.ts'

	const { children } = $props()

	const mainStore = setMainStoreContext(new MainStore())
	setupAppViewTransitions(() => mainStore.isReducedMotion)

	const countPageView = (id: string | null | undefined) => {
		if (import.meta.env.DEV || import.meta.env.SSR) {
			return
		}

		window.goatcounter?.count({
			path: id ?? 'unknown',
		})
	}

	// Initial page view
	countPageView(page.route.id)

	afterNavigate((nav) => {
		let id = nav.to?.route?.id ?? 'unknown'
		if (id === 'unknown' && nav.to?.url.pathname === '/') {
			id = '/(marketing)'
		}

		window.goatcounter?.count({
			path: id,
		})
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
