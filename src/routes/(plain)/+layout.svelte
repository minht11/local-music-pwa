<script lang="ts">
	import { page } from '$app/stores'
	import Header from '$lib/components/Header.svelte'

	const { children } = $props()

	const pageData = $derived($page.data)
</script>

<Header title={pageData.title} mode="fixed" />

<div class="flex grow flex-col px-4">
	{@render children()}
</div>

<div class="mt-4 h-[var(--bottom-overlay-height)] shrink-0"></div>
