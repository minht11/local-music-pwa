<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'

	interface Props {
		title: string
		browseAction?: boolean
	}

	const { title, browseAction = true }: Props = $props()
</script>

<div class="m-auto flex flex-col items-center text-center">
	<Icon type="playlistMusic" class="color-onSecondaryContainer my-auto size-35 opacity-54" />

	<div class="text-body-lg">{title}</div>

	{#if browseAction}
		<Button kind="outlined" as="a" class="mt-4" href="/library/tracks">
			{m.playerQueuePlaySomething()}
		</Button>
	{/if}
</div>
