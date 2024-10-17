<script lang="ts">
	import { page } from '$app/stores'
	import Header from '$lib/components/Header.svelte'

	const { children } = $props()

	const pageData = $derived($page.data)
</script>

<Header title={pageData.title} mode="fixed" />

<div class="flex flex-col px-16px grow">
	{@render children()}
</div>

<div class="h-[var(--bottom-overlay-height)] shrink-0 mt-16px"></div>
