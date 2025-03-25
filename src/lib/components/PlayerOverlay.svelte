<script lang="ts">
	import Button from './Button.svelte'
	import Icon from './icon/Icon.svelte'
	import FavoriteButton from './player/buttons/FavoriteButton.svelte'
	import PlayNextButton from './player/buttons/PlayNextButton.svelte'
	import PlayToggleButton from './player/buttons/PlayToggleButton.svelte'
	import MainControls from './player/MainControls.svelte'
	import PlayerArtwork from './player/PlayerArtwork.svelte'
	import Timeline from './player/Timeline.svelte'
	import VolumeSlider from './player/VolumeSlider.svelte'

	const { class: className }: { class?: ClassValue } = $props()

	const mainStore = useMainStore()
	const player = usePlayer()

	const track = $derived(player.activeTrack)
</script>

<div
	class={[
		'view-transition-pl-container pointer-events-auto mx-auto max-w-225 justify-between overflow-hidden rounded-2xl border border-primary/10 bg-secondaryContainer text-onSecondaryContainer sm:h-auto sm:rounded-3xl',
		className,
	]}
>
	<div
		class="player-content flex h-full w-full flex-col items-center justify-between gap-4 sm:px-4 sm:pt-2 sm:pb-4"
	>
		<Timeline class="max-sm:hidden" />
		<div class="flex h-min w-full grow grid-cols-[1fr_max-content_1fr] items-center sm:grid">
			<div class="flex grow items-center">
				<Button
					as="a"
					href="/player"
					kind="blank"
					tooltip={m.playerOpenFullPlayer()}
					class="max-sm:rounded-r-4 group flex grow items-center rounded-lg pr-2 max-sm:p-2 sm:h-11 sm:max-w-45"
				>
					<div
						class="player-artwork relative -z-1 size-11 shrink-0 overflow-hidden rounded-lg bg-onSecondary"
					>
						{#if track}
							<PlayerArtwork class="size-full" />
						{/if}

						<Icon
							type="chevronUp"
							class={[
								'pl-overlay-chevron-up-icon absolute inset-0 m-auto shrink-0',
								track &&
									'scale-0 rounded-full bg-tertiary text-onTertiary transition-[transform,opacity] duration-200 [.group:hover_&]:scale-100',
							]}
						/>
					</div>

					{#if track}
						<div class="mr-1 ml-4 min-w-0">
							<div class="truncate text-body-md">{track.name}</div>
							<div class="truncate text-body-sm">{track.artists}</div>
						</div>
					{/if}
				</Button>

				<FavoriteButton />
			</div>

			<div class="ml-auto flex gap-2 pr-2 sm:hidden">
				<PlayToggleButton />

				<PlayNextButton class="max-xss:hidden" />
			</div>

			<MainControls class="max-sm:hidden" />

			<div class="ml-auto flex items-center gap-2 pr-2 max-sm:hidden">
				{#if mainStore.volumeSliderEnabled}
					<VolumeSlider />
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	@reference '../../app.css';

	.view-transition-pl-container {
		view-transition-name: pl-container;
	}

	.controls {
		grid-template-columns: 1fr max-content 1fr;
	}

	:global(html[data-view-player]) {
		.player-content {
			view-transition-name: pl-content;
		}

		.player-artwork {
			view-transition-name: pl-artwork;
		}

		:global(.pl-overlay-chevron-up-icon) {
			view-transition-name: pl-chevron-up;
		}
	}

	::view-transition-old(pl-chevron-up) {
		display: none;
	}

	@keyframes -global-view-pl-chevron-up-fade-in {
		from {
			opacity: 0;
			transform: scale(0);
		}
	}

	::view-transition-new(pl-chevron-up) {
		animation: view-pl-chevron-up-fade-in 125ms 225ms linear backwards;
	}
</style>
