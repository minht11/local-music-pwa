<script lang="ts">
	import type { PageData } from './$types'
	// import SlotContent from '$lib/components/slot/SlotContent.svelte'
	export let data: PageData

	const { time } = data
</script>

<div>{$time}</div>
<h1>Inside page</h1>

<div class="h-[200vh] flex-shrink-0">
	<h1>Top level</h1>
</div>
