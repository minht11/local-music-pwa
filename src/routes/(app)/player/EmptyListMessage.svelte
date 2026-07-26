<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'

	interface Props {
		title: string
		/**
		 * Offers a way into the library. Off when the list is empty but playback is
		 * under way — sending a listener out of the player is a non-sequitur.
		 */
		browseAction?: boolean
	}

	const { title, browseAction = true }: Props = $props()
</script>

<div class="m-auto flex flex-col items-center text-center">
	<Icon type="playlistMusic" class="color-onSecondaryContainer my-auto size-35 opacity-54" />

	<div class={['text-body-lg', browseAction && 'mb-4']}>{title}</div>

	{#if browseAction}
		<Button kind="outlined" as="a" href="/library/tracks">
			{m.playerQueuePlaySomething()}
		</Button>
	{/if}
</div>
