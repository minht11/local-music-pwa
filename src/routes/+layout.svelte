<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { page } from '$app/state'

	const { children } = $props()

	afterNavigate((nav) => {
		if (import.meta.env.DEV) {
			return
		}

		window.goatcounter?.count({
			path: nav.to?.route.id ?? 'unknown',
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
