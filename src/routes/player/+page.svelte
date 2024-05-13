<script>
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'

	import Slider from '$lib/components/Slider.svelte'
	import Timeline from '$lib/components/player/Timeline.svelte'
	import PlayNextButton from '$lib/components/player/buttons/PlayNextButton.svelte'
	import PlayPrevButton from '$lib/components/player/buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from '$lib/components/player/buttons/PlayTogglePillButton.svelte'
	import RepeatButton from '$lib/components/player/buttons/RepeatButton.svelte'
	import ShuffleButton from '$lib/components/player/buttons/ShuffleButton.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte'

	const { data } = $props()

	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const isCompactMedia = useMediaQuery('(max-width: 767px)')
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

<div class="w-full max-w-1280px invisible view-transition-pl-container mx-auto fixed inset-0"></div>
<section
	class="view-transition-pl-content bg-secondaryContainer grow flex flex-col mx-auto w-full max-w-1280px"
>
	<div class="flex sm:grow md:grid grow grid-cols-[400px_1fr]">
		{#if (isCompact && !data.isQueueOpen) || !isCompact}
			<div
				class="flex flex-col z-0 bg-surfaceContainerLowest p-8px pt-[calc(var(--app-header-height)+8px)] gap-8px overflow-clip items-center grow sm:sticky sm:max-h-100vh top-0"
			>
				<div class="absolute -z-1 h-full w-full inset-0 bg-secondaryContainer/40"></div>

				<PlayerArtwork
					class="rounded-16px bg-secondaryContainer view-transition-pl-artwork max-w-300px w-full my-auto"
				/>

				<div class="bg-surfaceContainerHighest rounded-16px w-full">
					<div class="h-56px flex flex-col items-center justify-center px-24px rounded-16px">
						<Timeline />
					</div>

					<div class="flex bg-secondaryContainer flex-col p-16px px-16px rounded-16px">
						<div class="flex items-center gap-8px py-24px my-auto justify-between">
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
				</div>

				<div class="w-full bg-secondaryContainer px-16px rounded-16px flex items-center h-72px">
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
	::view-transition-old(pl-content) {
		animation: fade-out 75ms linear forwards;
	}

	::view-transition-new(pl-content) {
		animation: fade-in 325ms 75ms linear both;
	}

	::view-transition-group(pl-artwork),
	::view-transition-group(pl-content) {
		animation-duration: 400ms;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}

	:global(html) {
		--vt-pl-container-radius: 16px;
		--vt-pl-container-from-radius: 0;
		--vt-pl-container-to-radius: var(--vt-pl-container-radius);
	}

	:global(html[data-view-to='/player']) {
		--vt-pl-container-from-radius: var(--vt-pl-container-radius);
		--vt-pl-container-to-radius: 0;
	}

	@screen sm {
		:global(html) {
			--vt-pl-container-radius: 24px;
		}
	}

	@keyframes player-container-rounded {
		from {
			border-radius: var(--vt-pl-container-from-radius);
		}
		to {
			border-radius: var(--vt-pl-container-to-radius);
		}
	}

	::view-transition-group(pl-container) {
		background: theme('colors.secondaryContainer');
		animation:
			player-container-rounded 400ms cubic-bezier(0.2, 0, 0, 1),
			-ua-view-transition-group-anim-pl-container 400ms cubic-bezier(0.2, 0, 0, 1);
	}

	::view-transition-image-pair(pl-container) {
		display: none;
	}
</style>
