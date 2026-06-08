<script lang="ts">
	import Header from '$lib/components/Header.svelte'

	interface Props {
		children: Snippet
		title: string
	}

	const { title, children }: Props = $props()
</script>

<Header {title} />

<div class="flex grow flex-col px-4">
	{@render children()}
</div>

<div class="mt-4 h-(--bottom-overlay-height) shrink-0"></div>
