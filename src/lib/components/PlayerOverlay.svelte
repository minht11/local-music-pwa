<script lang="ts">
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import Button from './Button.svelte'
	import IconButton from './IconButton.svelte'
	import Icon from './icon/Icon.svelte'
	import MainControls from './player/MainControls.svelte'
	import PlayerArtwork from './player/PlayerArtwork.svelte'
	import Timeline from './player/Timeline.svelte'
	import VolumeSlider from './player/VolumeSlider.svelte'
	import PlayNextButton from './player/buttons/PlayNextButton.svelte'
	import PlayToggleButton from './player/buttons/PlayToggleButton.svelte'
	// import PlayNextButton from './buttons/PlayNextButton.svelte'
	// import PlayPrevButton from './buttons/PlayPrevButton.svelte'

	const { class: className }: { class?: string } = $props()

	const mainStore = useMainStore()
	const player = usePlayer()
</script>

<div
	class={clx(
		'view-transition-pl-container border border-primary/10 overflow-hidden max-w-900px mx-auto justify-between sm:h-auto rounded-16px sm:rounded-24px bg-secondaryContainer text-onSecondaryContainer',
		className,
	)}
>
	<div
		class="player-content h-full justify-between gap-16px flex flex-col items-center w-full sm:px-16px sm:pt-8px sm:pb-16px"
	>
		<Timeline class="max-sm:hidden" />
		<div class="flex sm:grid items-center w-full h-min grow grid-cols-[1fr_max-content_1fr]">
			<Button
				as="a"
				href="/player"
				kind="blank"
				class="flex items-center max-sm:p-8px max-sm:rounded-r-16px rounded-8px grow sm:h-44px pr-8px sm:max-w-180px group"
			>
				{@const track = player.activeTrack}
				<div
					class="player-artwork rounded-8px overflow-hidden shrink-0 relative h-44px w-44px ring-1 ring-inset ring-onSecondaryContainer/40"
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

			<div class="ml-uto flex gap-8px sm:hidden pr-8px">
				<PlayToggleButton />

				<PlayNextButton class="max-xss:hidden" />
			</div>

			<MainControls class="max-sm:hidden" />

			<div class="flex items-center gap-8px ml-auto max-sm:hidden">
				{#if mainStore.volumeSliderEnabled}
					<VolumeSlider />
				{/if}

				<IconButton icon="moreVertical" />
			</div>
		</div>
	</div>
</div>

<style>
	.controls {
		grid-template-columns: 1fr max-content 1fr;
	}

	:global(html:is([data-view-from='/player'], [data-view-to='/player'])) .player-content {
		view-transition-name: pl-content;
	}

	:global(:is([data-view-from='/player'], [data-view-to='/player'])) .player-artwork {
		view-transition-name: pl-artwork;
	}
</style>
