<script>
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'

	import { page } from '$app/stores'
	import BackButton from '$lib/components/BackButton.svelte'
	import Header from '$lib/components/Header.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import Timeline from '$lib/components/player/Timeline.svelte'
	import PlayNextButton from '$lib/components/player/buttons/PlayNextButton.svelte'
	import PlayPrevButton from '$lib/components/player/buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from '$lib/components/player/buttons/PlayTogglePillButton.svelte'
	import RepeatButton from '$lib/components/player/buttons/RepeatButton.svelte'
	import ShuffleButton from '$lib/components/player/buttons/ShuffleButton.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte'

	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const isCompactMedia = useMediaQuery('(max-width: 767px)')
	const isCompact = $derived(isCompactMedia.value)

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
			layoutMode === 'list' && 'max-w-500px mx-auto w-full',
			'flex flex-col z-0 bg-surfaceContainerLowest px-8px pb-8px gap-8px overflow-clip items-center grow',
		)}
	>
		<div class="h-64px w-full flex gap-8px items-center">
			<BackButton />

			<div class="text-title-lg mx-auto">Player</div>

			<div class="w-40px"></div>
		</div>

		<div class="absolute -z-1 h-full w-full inset-0 bg-secondaryContainer/40"></div>

		<PlayerArtwork
			class="rounded-16px bg-secondaryContainer view-transition-pl-artwork max-w-300px w-full my-auto ring-1 ring-secondaryContainer"
		/>

		<div class="w-full bg-surfaceContainerHighest px-16px py-8px rounded-16px">
			<Timeline class="w-full" />
		</div>

		<div
			class="bg-secondaryContainer flex flex-col px-16px pb-16px pt-32px gap-24px rounded-16px w-full"
		>
			<div class="flex items-center gap-8px my-auto justify-between">
				<ShuffleButton />

				<PlayPrevButton />

				<PlayTogglePillButton />

				<PlayNextButton />

				<RepeatButton />
			</div>

			<div class="flex items-center gap-8px">
				<IconButton icon="volumeMid" />

				<Slider bind:value={player.volume} />

				<IconButton icon="volumeHigh" />
			</div>
		</div>

		<div
			class="w-full bg-secondaryContainer px-16px rounded-16px flex items-center h-72px shrink-0"
		>
			{#if track}
				<div class="text-body-lg mr-8px min-w-24px text-center tabular-nums">
					{player.activeTrackIndex}
				</div>

				<div class="flex flex-col">
					<div class="truncate text-body-lg">{track.name}</div>
					<div class="truncate text-body-md">{track.artists}</div>
				</div>
			{/if}

			<div class="flex gap-4px ml-auto">
				<IconButton icon="favorite" />

				{#if layoutMode === 'list'}
					<IconButton icon="trayFull" as="a" href="/player/queue" />
				{/if}
			</div>
		</div>
	</div>
{/snippet}

{#snippet queueActions()}
	<IconButton icon="clearQueue" />
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
				<div class="text-title-lg mr-auto">
					{m.queue()}
				</div>

				{@render queueActions()}
			</div>
		{/if}

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

<ListDetailsLayout
	mode={layoutMode}
	class={clx(
		layoutMode === 'list' ? 'bg-surfaceContainerLowest' : 'bg-secondaryContainer',
		'view-transition-pl-content grow mx-auto w-full max-w-1280px',
	)}
	list={playerSnippet}
	details={queueSnippet}
/>

<style lang="postcss">
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

	:global(html:is([data-view-from='/player'], [data-view-to='/player']))::view-transition-group(
			pl-container
		) {
		background: theme('colors.secondaryContainer');
		animation:
			player-container-rounded 400ms cubic-bezier(0.2, 0, 0, 1),
			-ua-view-transition-group-anim-pl-container 400ms cubic-bezier(0.2, 0, 0, 1);
	}

	:global(
			html:is([data-view-from='/player'], [data-view-to='/player'])
		)::view-transition-image-pair(pl-container) {
		display: none;
	}
</style>
