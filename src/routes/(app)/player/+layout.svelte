<script lang="ts">
	import { page } from '$app/state'
	import BackButton from '$lib/components/BackButton.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import PlayerFavoriteButton from '$lib/components/player/buttons/PlayerFavoriteButton.svelte'
	import PlayNextButton from '$lib/components/player/buttons/PlayNextButton.svelte'
	import PlayPrevButton from '$lib/components/player/buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from '$lib/components/player/buttons/PlayTogglePillButton.svelte'
	import RepeatButton from '$lib/components/player/buttons/RepeatButton.svelte'
	import ShuffleButton from '$lib/components/player/buttons/ShuffleButton.svelte'
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import Timeline from '$lib/components/player/Timeline.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'

	const { data } = $props()

	const mainStore = useMainStore()
	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const sizes = $derived.by(data.sizes)
	const isCompactVertical = $derived(sizes.isCompactVertical)
	const layoutMode = $derived(data.layoutMode(sizes.isCompact, page.url.pathname))
</script>

{#snippet playerSnippet()}
	<div
		class={[
			layoutMode === 'both' && 'w-100',
			layoutMode === 'list' && 'mx-auto w-full',
			'player-content z-0 grow items-center gap-x-6 overflow-clip bg-secondaryContainerVariant px-2 pb-2',
			isCompactVertical && !sizes.isCompactHorizontal && 'player-content-horizontal',
		]}
	>
		<div
			class={[
				isCompactVertical && !sizes.isCompactHorizontal ? 'absolute top-0 left-0 h-14' : 'h-16',
				'flex w-full items-center justify-between gap-2 [grid-area:header]',
			]}
		>
			<BackButton />

			<div class="text-title-lg">{m.player()}</div>

			<div class="w-10"></div>
		</div>

		<PlayerArtwork
			class="m-auto my-auto h-full max-h-75 rounded-2xl bg-onSecondary [grid-area:artwork] active-view-player:view-name-[pl-artwork]"
		/>

		<div class="mt-2 flex w-full flex-col gap-2 [grid-area:controls]">
			<div class="w-full rounded-2xl bg-surfaceContainerHighest px-4 py-2">
				<Timeline class="w-full" />
			</div>

			<div
				class={[
					'flex w-full flex-col gap-6 rounded-2xl bg-secondaryContainer px-4 [grid-area:header]',
					mainStore.volumeSliderEnabled ? 'pt-8 pb-4' : 'py-8',
				]}
			>
				<div class="my-auto flex items-center justify-between gap-2">
					<ShuffleButton />

					<PlayPrevButton />

					<PlayTogglePillButton />

					<PlayNextButton />

					<RepeatButton />
				</div>

				{#if mainStore.volumeSliderEnabled}
					<div class="flex items-center gap-2">
						<IconButton icon="volumeMid" tooltip="Decrease volume" />

						<Slider bind:value={player.volume} />

						<IconButton icon="volumeHigh" tooltip="Increase volume" />
					</div>
				{/if}
			</div>

			<div class="flex h-18 w-full shrink-0 items-center rounded-2xl bg-secondaryContainer px-4">
				{#if track}
					<div class="mr-2 min-w-6 text-center text-body-lg tabular-nums">
						{player.activeTrackIndex}
					</div>

					<div class="grid overflow-hidden">
						<div class="truncate text-body-lg">{track.name}</div>
						<div class="truncate text-body-md">{track.artists}</div>
					</div>
				{/if}

				<div class="ml-auto flex gap-1">
					<PlayerFavoriteButton />

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

	<div class="flex w-full grow flex-col">
		{#if layoutMode !== 'details'}
			<div class="flex h-16 items-center border-b border-onSecondaryContainer/24 px-4">
				<div class="w-10"></div>

				<div class="mx-auto text-title-lg">
					{m.queue()}
				</div>

				{@render queueActions()}
			</div>
		{/if}

		<div class="flex grow p-4">
			{#if player.isQueueEmpty}
				<div class="m-auto flex flex-col items-center text-center">
					<Icon
						type="playlistMusic"
						class="color-onSecondaryContainer my-auto size-35 opacity-54"
					/>

					<div class="mb-4 text-body-lg">{m.playerQueueEmpty()}</div>
					<Button kind="outlined" as="a" href="/library/tracks">
						{m.playerQueuePlaySomething()}
					</Button>
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

<ListDetailsLayout
	id="full-player"
	mode={layoutMode}
	class={[
		'mx-auto w-full max-w-300 grow active-view-player:view-name-[pl-card]',
		layoutMode === 'both' && 'bg-secondaryContainer',
	]}
	list={playerSnippet}
	details={queueSnippet}
	noListStableGutter
	noPlayerOverlayPadding
/>

<style lang="postcss">
	@reference '../../../app.css';

	.player-content {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: max-content minmax(--spacing(35), 1fr) auto;
		grid-template-areas: 'header' 'artwork' 'controls';
	}

	.player-content-horizontal {
		grid-template-columns:
			1fr minmax(0, --spacing(75)) minmax(0, --spacing(125))
			1fr;
		grid-template-rows: max-content 1fr;
		grid-template-areas:
			'header header header header'
			'. artwork controls .';
	}

	@keyframes -global-view-player-container-rounded {
		from {
			border-radius: var(--vt-pl-card-from-radius);
		}
		to {
			border-radius: var(--vt-pl-card-to-radius);
		}
	}

	@keyframes -global-view-player-card-morph-enter {
		from {
			width: var(--mp-width);
			height: var(--mp-height);
			translate: var(--mp-left) calc(var(--mp-bottom) - var(--mp-height));
		}
		to {
			width: var(--fp-width);
			height: 100svh;
			translate: var(--fp-left) 0;
		}
	}

	@keyframes -global-view-player-card-morph-exit {
		from {
			width: var(--fp-width);
			height: 100svh;
			translate: var(--fp-left) 0;
		}
		to {
			width: var(--mp-width);
			height: var(--mp-height);
			translate: var(--mp-left) calc(var(--mp-bottom) - var(--mp-height));
		}
	}

	:global(html:active-view-transition-type(player)) {
		--vt-pl-card-radius: var(--radius-2xl);
		@media (width >= --theme(--breakpoint-sm)) {
			--vt-pl-card-radius: var(--radius-3xl);
		}

		&::view-transition-group(pl-card) {
			overflow: clip;
			background: var(--color-secondaryContainer);
			top: 0;
			left: 0;
			transform: none;
			height: 100%;
			animation:
				view-player-container-rounded 400ms cubic-bezier(0.2, 0, 0, 1),
				var(--vt-pl-card-morph-ani) 400ms cubic-bezier(0.2, 0, 0, 1);
		}

		&::view-transition-old(pl-card),
		&::view-transition-new(pl-card) {
			overflow: clip;
		}

		&::view-transition-old(pl-card) {
			animation: fade-out 75ms linear forwards;
		}

		&::view-transition-new(pl-card) {
			animation: fade-in 325ms 75ms linear both;
		}

		&:active-view-transition-type(forwards) {
			--vt-pl-card-from-radius: var(--vt-pl-card-radius);
			--vt-pl-card-to-radius: 0;
			--vt-pl-card-morph-ani: view-player-card-morph-enter;

			&::view-transition-old(pl-card) {
				object-fit: contain;
			}

			&::view-transition-new(pl-card) {
				object-fit: cover;
				object-position: 0 calc(-1 * var(--fp-scroll-top));
			}
		}

		&:active-view-transition-type(backwards) {
			--vt-pl-card-from-radius: 0;
			--vt-pl-card-to-radius: var(--vt-pl-card-radius);
			--vt-pl-card-morph-ani: view-player-card-morph-exit;

			&::view-transition-old(pl-card) {
				object-fit: cover;
				object-position: 0 calc(-1 * var(--fp-scroll-top));
			}

			&::view-transition-new(pl-card) {
				object-fit: contain;
			}
		}

		&::view-transition-group(pl-artwork) {
			animation-duration: 400ms;
			animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
		}
	}
</style>
