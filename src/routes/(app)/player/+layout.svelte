<script lang="ts">
	import { goto } from '$app/navigation'
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
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import Tabs from '$lib/components/Tabs.svelte'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.js'
	import { formatArtists, getItemLanguage } from '$lib/helpers/utils/text.ts'
	import { clearPlayHistory } from '$lib/library/play-history-actions.js'
	import type { BuiltinEqPresetKey } from '$lib/stores/player/equalizer.svelte.ts'
	import HistoryList from './HistoryList.svelte'
	import { getLayoutProps } from './layout-props.ts'
	import QueueList from './QueueList.svelte'

	const { data, children } = $props()

	initPageQueries(() => data)

	const mainStore = useMainStore()
	const player = usePlayer()
	const dialogs = useDialogsStore()
	const activeTrack = $derived(player.activeTrack)
	let isAudioControlsOpen = $state(false)

	const isSelectedTabQueue = $derived(
		page.route.id === '/(app)/player' || page.route.id === '/(app)/player/queue',
	)

	const { isCompactHorizontal, isCompactVertical, layoutMode } = $derived(
		getLayoutProps(page.route.id),
	)

	const toggleAudioControls = () => {
		if (!isAudioControlsOpen) {
			mainStore.volumeSliderEnabled = true
		}

		isAudioControlsOpen = !isAudioControlsOpen
	}

	const equalizerPresetLabel = $derived.by(() => {
		const labels: Record<BuiltinEqPresetKey, string> = {
			flat: m.equalizerPresetFlat(),
			bassBoost: m.equalizerPresetBassBoost(),
			trebleBoost: m.equalizerPresetTrebleBoost(),
			rock: m.equalizerPresetRock(),
			pop: m.equalizerPresetPop(),
			jazz: m.equalizerPresetJazz(),
			classical: m.equalizerPresetClassical(),
			electronic: m.equalizerPresetElectronic(),
			acoustic: m.equalizerPresetAcoustic(),
		}

		const preset = player.equalizer.selectedPreset

		return preset ? labels[preset] : m.equalizerPresetCustom()
	})
</script>

{#snippet playerSnippet()}
	<div
		class={[
			layoutMode === 'both' && 'w-100 2xl:w-[28dvw]',
			layoutMode === 'list' && 'mx-auto w-full',
			'player-content z-0 grow items-center gap-x-6 overflow-clip bg-secondaryContainerVariant pb-6',
			isCompactVertical && !isCompactHorizontal && 'player-content-horizontal',
		]}
	>
		<div
			class={[
				isCompactVertical && !isCompactHorizontal ? 'absolute top-0 left-0 h-14' : 'h-16',
				'relative flex w-full items-center justify-between gap-2 px-4 [grid-area:header]',
			]}
		>
			<BackButton />

			<div class="absolute inset-0 m-auto flex size-max items-center text-title-lg">
				{m.player()}
			</div>
		</div>

		<div class="player-artwork-section h-full w-full px-4 [grid-area:artwork]">
			<PlayerArtwork
				class="h-full max-h-90 w-max max-w-full place-self-center rounded-3xl bg-onSecondary active-view-player:view-name-[pl-artwork]"
			/>

			<div class="flex min-h-18 w-full shrink-0 items-center">
				{#if activeTrack}
					<div class="grid overflow-hidden" lang={getItemLanguage(activeTrack.language)}>
						<div class="truncate text-title-lg">{activeTrack.name}</div>
						<div class="truncate text-body-md text-onSecondaryContainer">
							{formatArtists(activeTrack.artists)}
						</div>
					</div>
				{/if}

				<div class="ml-auto flex gap-1">
					<PlayerFavoriteButton />
				</div>
			</div>
		</div>

		<div class="mt-2 flex w-full flex-col [grid-area:controls]">
			<div class="controls-switcher">
				{#if isAudioControlsOpen}
					<div class="flex min-h-38 flex-col justify-center gap-2 px-4">
						<div class="grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-2">
							<IconButton
								icon="volumeMid"
								tooltip={m.playerDecreaseVolume()}
								onclick={() => (player.volume -= 10)}
							/>

							<Slider bind:value={player.volume} />

							<IconButton
								icon="volumeHigh"
								tooltip={m.playerIncreaseVolume()}
								onclick={() => (player.volume += 10)}
							/>
						</div>

						<div class="border-t border-onSecondaryContainer/10"></div>

						<Button
							kind="blank"
							class="flex h-10 w-full items-center gap-1 rounded-lg pl-2 text-body-md"
							onclick={() => {
								dialogs.openDialog('equalizer')
							}}
						>
							<div>{m.equalizerTitle()}</div>

							<div class="ml-auto text-onSecondaryContainer">{equalizerPresetLabel}</div>

							<Icon type="chevronRight" />
						</Button>
					</div>
				{:else}
					<div class="flex flex-col gap-6 px-4 py-5">
						<Timeline class="w-full" />

						<div class="grid grid-cols-5 place-items-center gap-2">
							<ShuffleButton />

							<PlayPrevButton />

							<PlayTogglePillButton />

							<PlayNextButton />

							<RepeatButton />
						</div>
					</div>
				{/if}
			</div>

			<div
				class="player-controls-footer grid grid-cols-[max-content_1fr_max-content] items-center border-t border-onSecondaryContainer/10 px-4 pt-5"
			>
				<Button kind={isAudioControlsOpen ? 'toned' : 'toned-low'} onclick={toggleAudioControls}>
					{#if isAudioControlsOpen}
						<Icon type="musicNote" />

						{m.playerPlaybackControls()}
					{:else}
						<Icon type="volumeHigh" />

						{m.playerAudio()}
					{/if}
				</Button>

				{#if layoutMode === 'list'}
					<Button as="a" href="/player/queue" kind="toned-low" class="col-start-3">
						{m.playerNextUp()}

						<Icon type="trayFull" />
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

{#snippet queueSnippet()}
	<!--
		For view transition to work correctly we need to clip the captured element size
		so we can't use root scroller here.
	-->
	<ScrollContainer
		class="flex h-dvh scroll-pt-(--app-header-height) scrollbar-gutter-stable flex-col overflow-auto contain-strict"
	>
		<Header
			mode="sticky"
			noBackButton={layoutMode !== 'details'}
			class={(isElevated) => [
				'border-b',
				isElevated ? 'border-transparent' : 'border-onSecondaryContainer/24',
			]}
		>
			<div class="absolute inset-0 m-auto size-max">
				<Tabs
					selectedIndex={isSelectedTabQueue ? 0 : 1}
					items={[
						{ id: 'queue', text: m.queue() },
						{ id: 'history', text: m.playerHistory() },
					]}
					onchange={(item) => {
						void goto(`/player/${item.id}`, { replaceState: true })
					}}
				>
					{#snippet text(item)}
						{item.text}
					{/snippet}
				</Tabs>
			</div>

			{#if !isSelectedTabQueue}
				<IconButton
					tooltip={m.playerClearHistory()}
					disabled={data.historyTrackIds.value.length === 0}
					icon="trayRemove"
					onclick={() => void clearPlayHistory()}
				/>
			{/if}
		</Header>

		<div class="mx-auto flex w-full max-w-(--app-max-content-width) grow flex-col">
			<div class="flex grow p-4">
				{#if isSelectedTabQueue}
					<QueueList />
				{:else}
					<HistoryList items={data.historyTrackIds.value} />
				{/if}
			</div>
		</div>
	</ScrollContainer>
{/snippet}

<ListDetailsLayout
	id="full-player"
	mode={layoutMode}
	class={[
		'grow active-view-player:view-name-[pl-card]',
		layoutMode === 'both' && 'bg-secondaryContainer',
	]}
	list={playerSnippet}
	details={queueSnippet}
	noListStableGutter
	noPlayerOverlayPadding
/>

<!-- Only used to prevent "tag missing — inner content will not be rendered" build warning -->
{@render children()}

<style lang="postcss">
	@reference '../../../app.css';

	.player-content {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: max-content minmax(--spacing(35), 1fr) auto;
		grid-template-areas: 'header' 'artwork' 'controls';
	}

	.player-content-horizontal {
		grid-template-columns: 1fr minmax(0, --spacing(75)) minmax(0, --spacing(125)) 1fr;
		grid-template-rows: max-content 1fr;
		grid-template-areas:
			'header header header header'
			'. artwork controls .';
	}

	.player-artwork-section {
		display: grid;
		grid-template-rows: minmax(0, 1fr) max-content;
		gap: --spacing(4);
	}

	.controls-switcher {
		min-height: --spacing(38);
	}

	.player-controls-footer {
		margin-top: clamp(--spacing(4), 3dvh, --spacing(6));
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
			width: 100dvw;
			height: 100dvh;
			translate: 0 0;
		}
	}

	@keyframes -global-view-player-card-morph-exit {
		from {
			width: 100dvw;
			height: 100dvh;
			translate: 0 0;
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
				view-player-container-rounded 400ms var(--ease-standard) forwards,
				var(--vt-pl-card-morph-ani) 400ms var(--ease-standard) forwards;
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
			}
		}

		&:active-view-transition-type(backwards) {
			--vt-pl-card-from-radius: 0;
			--vt-pl-card-to-radius: var(--vt-pl-card-radius);
			--vt-pl-card-morph-ani: view-player-card-morph-exit;

			&::view-transition-old(pl-card) {
				object-fit: cover;
			}

			&::view-transition-new(pl-card) {
				object-fit: contain;
			}
		}

		&::view-transition-group(pl-artwork) {
			animation-duration: 400ms;
			animation-timing-function: var(--ease-standard);
		}
	}
</style>
