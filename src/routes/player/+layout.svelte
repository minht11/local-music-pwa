<script>
	import { page } from '$app/stores'
	import BackButton from '$lib/components/BackButton.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import Timeline from '$lib/components/player/Timeline.svelte'
	import FavoriteButton from '$lib/components/player/buttons/FavoriteButton.svelte'
	import PlayNextButton from '$lib/components/player/buttons/PlayNextButton.svelte'
	import PlayPrevButton from '$lib/components/player/buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from '$lib/components/player/buttons/PlayTogglePillButton.svelte'
	import RepeatButton from '$lib/components/player/buttons/RepeatButton.svelte'
	import ShuffleButton from '$lib/components/player/buttons/ShuffleButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte'
	import { useMainStore } from '$lib/stores/main-store.svelte'

	const mainStore = useMainStore()
	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const isCompactVerticalMedia = useMediaQuery('(max-height: 600px)')
	const isCompactVertical = $derived(isCompactVerticalMedia.value)
	const isCompactHorizontalMedia = useMediaQuery('(max-width: 767px)')
	const isCompactHorizontal = $derived(isCompactHorizontalMedia.value)
	const isVeryCompactHorizontal = useMediaQuery('(max-width: 600px)')

	const isCompact = $derived(isCompactVertical || isCompactHorizontal)

	const layoutMode = $derived.by(() => {
		if (!isCompact) {
			return 'both'
		}

		if ($page.url.pathname.endsWith('/queue')) {
			return 'details'
		}

		return 'list'
	})
</script>

{#snippet playerSnippet()}
	<div
		class={clx(
			layoutMode === 'both' && 'w-400px',
			layoutMode === 'list' && 'mx-auto w-full',
			'player-content z-0 bg-secondaryContainerVariant px-8px pb-8px gap-x-24px overflow-clip items-center grow',
			isCompactVertical && !isVeryCompactHorizontal.value && 'player-content-horizontal',
		)}
	>
		<div
			class={clx(
				isCompactVertical && !isVeryCompactHorizontal.value
					? 'h-56px absolute top-0 left-0'
					: 'h-64px',
				'w-full flex gap-8px items-center justify-between [grid-area:header]',
			)}
		>
			<BackButton />

			<div class="text-title-lg">Player</div>

			<div class="w-40px"></div>
		</div>

		<PlayerArtwork
			class="rounded-16px bg-surfaceContainerHigh m-auto view-transition-pl-artwork [grid-area:artwork] max-h-300px h-full my-auto"
		/>

		<div class="flex flex-col gap-8px w-full [grid-area:controls]">
			<div class="w-full bg-surfaceContainerHighest px-16px py-8px rounded-16px">
				<Timeline class="w-full" />
			</div>

			<div
				class={clx(
					'bg-secondaryContainer flex flex-col px-16px gap-24px rounded-16px w-full [grid-area:header]',
					mainStore.volumeSliderEnabled ? 'pt-32px pb-16px' : 'py-32px',
				)}
			>
				<div class="flex items-center gap-8px my-auto justify-between">
					<ShuffleButton />

					<PlayPrevButton />

					<PlayTogglePillButton />

					<PlayNextButton />

					<RepeatButton />
				</div>

				{#if mainStore.volumeSliderEnabled}
					<div class="flex items-center gap-8px">
						<IconButton icon="volumeMid" />

						<Slider bind:value={player.volume} />

						<IconButton icon="volumeHigh" />
					</div>
				{/if}
			</div>

			<div
				class="w-full bg-secondaryContainer px-16px rounded-16px flex items-center h-72px shrink-0"
			>
				{#if track}
					<div class="text-body-lg mr-8px min-w-24px text-center tabular-nums">
						{player.activeTrackIndex}
					</div>

					<div class="overflow-hidden grid">
						<div class="truncate text-body-lg truncate">{track.name}</div>
						<div class="truncate text-body-md truncate">{track.artists}</div>
					</div>
				{/if}

				<div class="flex gap-4px ml-auto">
					<FavoriteButton />

					{#if layoutMode === 'list'}
						<IconButton tooltip={m.playerOpenQueue()} icon="trayFull" as="a" href="/player/queue" />
					{/if}
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#snippet queueActions()}
	<IconButton
		tooltip={m.playerClearQueue()}
		disabled={player.isQueueEmpty}
		icon="trayRemove"
		onclick={player.clearQueue}
	/>
{/snippet}

{#snippet queueSnippet()}
	{#if layoutMode === 'details'}
		<Header title={m.queue()}>
			{#if layoutMode === 'details'}
				{@render queueActions()}
			{/if}
		</Header>
	{/if}

	<div class="w-full flex flex-col grow">
		{#if layoutMode !== 'details'}
			<div class="flex items-center h-64px border-b border-onSecondaryContainer/24 px-16px">
				<div class="w-40px"></div>

				<div class="text-title-lg mx-auto">
					{m.queue()}
				</div>

				{@render queueActions()}
			</div>
		{/if}

		<div class="p-16px flex grow">
			{#if player.isQueueEmpty}
				<div class="m-auto text-center flex flex-col items-center">
					<Icon
						type="playlistMusic"
						class="size-140px my-auto opacity-54 color-onSecondaryContainer"
					/>

					<div class="text-body-lg mb-16px">Your queue is empty</div>
					<Button kind="outlined" as="a" href="/">Play something here</Button>
				</div>
			{:else}
				<TracksListContainer
					items={player.itemsIds}
					predefinedMenuItems={{
						addToQueue: false,
					}}
					onItemClick={({ index }) => {
						player.playTrack(index)
					}}
				/>
			{/if}
		</div>
	</div>
{/snippet}

<div class="w-full max-w-1280px invisible view-transition-pl-container mx-auto fixed inset-0"></div>

<ListDetailsLayout
	mode={layoutMode}
	class={clx(
		'view-transition-pl-content grow mx-auto w-full max-w-1280px',
		layoutMode === 'both' && 'bg-secondaryContainer',
	)}
	list={playerSnippet}
	details={queueSnippet}
	noListStableGutter
	noPlayerOverlayPadding
/>

<style lang="postcss">
	.player-content {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: max-content minmax(140px, 1fr) auto;
		grid-template-areas: 'header' 'artwork' 'controls';
	}

	.player-content-horizontal {
		grid-template-columns: 1fr minmax(0, 300px) minmax(0, 500px) 1fr;
		grid-template-rows: max-content 1fr;
		grid-template-areas:
			'header header header header'
			'. artwork controls .';
	}

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

	@keyframes -global-view-player-container-rounded {
		from {
			border-radius: var(--vt-pl-container-from-radius);
		}
		to {
			border-radius: var(--vt-pl-container-to-radius);
		}
	}

	:global(html:is([data-view-from='/player'], [data-view-to='/player'])) :global {
		&::view-transition-group(pl-container) {
			background: theme('colors.secondaryContainer');
			animation:
				view-player-container-rounded 400ms cubic-bezier(0.2, 0, 0, 1),
				-ua-view-transition-group-anim-pl-container 400ms cubic-bezier(0.2, 0, 0, 1);
		}
		&::view-transition-image-pair(pl-container) {
			display: none;
		}
	}
</style>
