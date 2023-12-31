<script lang="ts">
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { usePlayer } from '$lib/stores/player/store.ts'
	import Button from './Button.svelte'
	import IconButton from './IconButton.svelte'
	import Icon from './icon/Icon.svelte'
	import Artwork from './player/Artwork.svelte'
	import MainControls from './player/MainControls.svelte'
	import Timeline from './player/Timeline.svelte'

	const player = usePlayer()
	const [artwork] = createManagedArtwork(() => player.activeTrack?.value?.image)
</script>

<div
	class="overlay px-16px pt-8px gap-8px flex flex-col items-center mx-auto h-96px w-full max-w-1000px rounded-24px bg-secondaryContainer text-onSecondaryContainer"
>
	<Timeline />
	<div class="grid items-center w-full controls">
		<Button
			as="a"
			href="/player"
			kind="blank"
			class="flex items-center rounded-8px h-44px pr-8px max-w-180px group"
		>
			{@const track = player.activeTrack.value}
			{@const image = track?.image}
			<div
				class="rounded-8px shrink-0 relative h-44px w-44px ring ring-inset ring-onSecondaryContainer/40"
			>
				{#if image}
					<Artwork src={artwork()} class="wh-full view-transition-artwork" />
				{/if}

				<Icon
					type="chevronUp"
					class={clx(
						'm-auto shrink-0 absolute inset-0',
						image &&
							'bg-secondary text-onSecondary rounded-full opacity-50 [group:hover_&]:opacity-100',
					)}
				/>
			</div>

			{#if track}
				<div class="min-w-0 ml-16px mr-4px">
					<div class="truncate text-body-md">{track.name}</div>
					<div class="truncate text-body-sm">{track.artists}</div>
				</div>
			{/if}
		</Button>

		<MainControls />

		<div class="ml-auto">
			<IconButton icon="moreVertical" />
		</div>
	</div>
</div>

<style>
	.overlay {
		view-transition-name: player-overlay;
	}

	.controls {
		grid-template-columns: 1fr max-content 1fr;
	}
</style>
