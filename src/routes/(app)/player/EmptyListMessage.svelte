<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'

	interface Props {
		title: string
	}

	const { title }: Props = $props()
</script>

<div class="m-auto flex flex-col items-center text-center">
	<Icon type="playlistMusic" class="color-onSecondaryContainer my-auto size-35 opacity-54" />

	<div class="mb-4 text-body-lg">{title}</div>
	<Button kind="outlined" as="a" href="/library/tracks">
		{m.playerQueuePlaySomething()}
	</Button>
</div>
