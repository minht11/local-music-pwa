<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { page } from '$app/state'

	const { children } = $props()

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
		countPageView(nav.to?.route?.id)
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
