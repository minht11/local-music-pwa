<script>
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'

	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte'
	import Timeline from '$lib/components/player/Timeline.svelte'
	import RepeatButton from '$lib/components/player/buttons/RepeatButton.svelte'
	import ShuffleButton from '$lib/components/player/buttons/ShuffleButton.svelte'
	import PlayNextButton from '$lib/components/player/buttons/PlayNextButton.svelte'
	import PlayPrevButton from '$lib/components/player/buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from '$lib/components/player/buttons/PlayTogglePillButton.svelte'
	import Slider from '$lib/components/Slider.svelte'

	const { data } = $props()

	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const isCompactMedia = useMediaQuery('(max-width: 768px)')
	const isCompact = $derived(isCompactMedia.value)
</script>

{#snippet queue()}
	<div class="w-full p-16px flex flex-col">
		<div class="flex items-center h-48px">
			<div class="text-title-md mr-auto ml-16px">Queue list</div>

			<Button kind="flat">Clear</Button>
		</div>

		{#if player.itemsIds.length === 0}
			<div class="m-auto text-center flex flex-col items-center gap-8px">
				<div>Your queue is empty</div>
				<Button kind="outlined" as="a" href="/">Play something here</Button>
			</div>
		{:else}
			<TracksListContainer
				items={player.itemsIds}
				onItemClick={({ index }) => {
					player.playTrack(index)
				}}
			/>
		{/if}
	</div>
{/snippet}

<!-- <div class="w-full bg-secondaryContainer/60 fixed inset-0" /> -->

<div
	class="w-full max-w-1280px bg-secondaryContainer view-transition-pl-container mx-auto fixed inset-0"
/>
<section class="view-transition-pl-content grow flex flex-col mx-auto w-full max-w-1280px">
	<div class="flex sm:grow sm:grid grow grid-cols-[400px_1fr]">
		{#if (isCompact && !data.isQueueOpen) || !isCompact}
			<div class="flex flex-col grow sm:sticky sm:max-h-100vh top-0 tonal-elevation-2">
				<div
					class="overflow-clip flex flex-col items-center justify-center grow pt-[calc(var(--app-header-height)+16px)] pb-40px relative bg-secondaryContainer/60"
				>
					<PlayerArtwork class="absolute h-full w-full -z-1 blur-10px inset-0 scale-110" />
					<PlayerArtwork class="rounded-24px view-transition-pl-artwork max-w-300px w-full" />
				</div>

				<Timeline class="-mt-12px z-0" />

				<div class="flex flex-col pt-24px pb-16px px-16px h-256px">
					<!-- <Timeline /> -->

					<div class="flex items-center gap-8px my-auto justify-between">
						<ShuffleButton />

						<PlayPrevButton />

						<PlayTogglePillButton />

						<PlayNextButton />

						<RepeatButton />
					</div>

					<div class="flex items-center gap-8px">
						<IconButton icon="volumeMid" />

						<Slider value={100} />

						<IconButton icon="volumeHigh" />
					</div>
				</div>

				<div
					class="min-w-0 mt-auto px-16px border-t border-onSecondaryContainer/20 flex items-center h-72px"
				>
					{#if track}
						<div class="text-body-lg mr-8px min-w-24px text-center tabular-nums">
							{player.activeTrackIndex}
						</div>

						<div class="flex flex-col">
							<div class="truncate text-title-lg">{track.name}</div>
							<div class="truncate text-body-md">{track.artists}</div>
						</div>
					{/if}

					<div class="flex gap-4px ml-auto">
						<IconButton icon="favorite" />

						<IconButton icon="trayFull" as="a" href="?queue" />
					</div>
				</div>
			</div>
		{/if}
		{#if !isCompact || (isCompact && data.isQueueOpen)}
			{@render queue()}
		{/if}
	</div>
</section>

<style>
	:root::view-transition-old(pl-content) {
		animation: fade-out 75ms linear forwards;
	}

	:root::view-transition-new(pl-content) {
		animation: fade-in 175ms 75ms linear both;
	}

	/* prettier-ignore */
	:root:is([data-view-from='/player'],[data-view-to='/player'])::view-transition-old(pl-container),
	:root:is([data-view-from='/player'],[data-view-to='/player'])::view-transition-new(pl-container) {
		animation: none;
		mix-blend-mode: normal;
	}

	@keyframes player-shape-enter {
		from {
			clip-path: inset(0% 0% calc(100% - 92px) 0% round 24px);
		}
		to {
			clip-path: inset(0% 0% 0% 0% round 0px);
		}
	}

	:root[data-view-to='/player']::view-transition-new(pl-container) {
		animation: player-shape-enter 250ms;
	}

	@keyframes player-shape-exit {
		from {
			clip-path: inset(0% 0% 0% 0% round 0px);
		}
		to {
			clip-path: inset(0% 0% calc(100% - 92px) 0% round 24px);
		}
	}

	:root[data-view-from='/player']::view-transition-old(pl-container) {
		animation: player-shape-exit 250ms forwards;
	}
</style>
