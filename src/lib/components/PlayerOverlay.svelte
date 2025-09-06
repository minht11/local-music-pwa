<script lang="ts">
	import { formatArtists } from '$lib/helpers/utils/text.ts'
	import Button from './Button.svelte'
	import Icon from './icon/Icon.svelte'
	import LikeButton from './player/buttons/LikeButton.svelte'
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
	id="mini-player"
	class={[
		'pointer-events-auto mx-auto max-w-225 justify-between overflow-hidden rounded-2xl border border-primary/10 bg-secondaryContainer text-onSecondaryContainer contain-content view-name-[pl-card] sm:h-auto sm:rounded-3xl active-view-player:border-transparent',
		className,
	]}
>
	<div
		class="flex h-full w-full flex-col items-center justify-between gap-4 sm:px-4 sm:pt-2 sm:pb-4"
	>
		<Timeline class="max-sm:hidden" />
		<div class="hello flex h-min w-full grow grid-cols-[1fr_max-content_1fr] items-center sm:grid">
			<div class="flex grow items-center">
				<Button
					as="a"
					href="/player"
					kind="blank"
					tooltip={m.playerOpenFullPlayer()}
					class="max-sm:rounded-r-4 group flex grow items-center rounded-lg pr-2 max-sm:p-2 sm:h-11 sm:max-w-45"
				>
					<div
						class="relative -z-1 size-11 shrink-0 overflow-hidden rounded-lg bg-onSecondary active-view-player:view-name-[pl-artwork]"
					>
						{#if track}
							<PlayerArtwork class="size-full" />
						{/if}

						<Icon
							type="chevronUp"
							class={[
								'absolute inset-0 m-auto shrink-0 active-view-player:view-name-[pl-chevron-up]',
								track &&
									'scale-0 rounded-full bg-tertiary text-onTertiary transition-[transform,opacity] duration-200 [.group:hover_&]:scale-100',
							]}
						/>
					</div>

					{#if track}
						<div class="mr-1 ml-4 grid min-w-0">
							<div class="truncate text-body-md">
								{track.name}
							</div>
							<div class="truncate text-body-sm">{formatArtists(track.artists)}</div>
						</div>
					{/if}
				</Button>

				<LikeButton />
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

<style lang="postcss">
	@reference '../../app.css';

	.controls {
		grid-template-columns: 1fr max-content 1fr;
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
