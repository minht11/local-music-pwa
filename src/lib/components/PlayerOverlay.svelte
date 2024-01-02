<script lang="ts">
	import { usePlayer } from '$lib/stores/player/store.ts'
	import Button from './Button.svelte'
	import IconButton from './IconButton.svelte'
	import Icon from './icon/Icon.svelte'
	import PlayerArtwork from './player/PlayerArtwork.svelte'
	import MainControls from './player/MainControls.svelte'
	import Timeline from './player/Timeline.svelte'

	const { class: className } = $props<{ class?: string }>()

	const player = usePlayer()
</script>

<div
	class={clx(
		'view-transition-player-overlay px-16px pt-8px pb-16px justify-between gap-8px flex flex-col items-center h-96px w-full rounded-24px bg-secondaryContainer text-onSecondaryContainer',
		className,
	)}
>
	<div
		class="view-transition-player-overlay-content justify-between grow gap-8px flex flex-col items-center w-full"
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
				<div
					class="view-transition-artwork rounded-8px overflow-hidden shrink-0 relative h-44px w-44px ring ring-inset ring-onSecondaryContainer/40"
				>
					{#if track}
						<PlayerArtwork class="wh-full" />
					{/if}

					<Icon
						type="chevronUp"
						class={clx(
							'm-auto shrink-0 absolute inset-0',
							track &&
								'bg-tertiary text-onTertiary rounded-full scale-0 transition-transform transition-opacity transition-200 [.group:hover_&]:scale-100',
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
</div>

<style>
	.controls {
		grid-template-columns: 1fr max-content 1fr;
	}
</style>
