<script lang="ts">
	import { page } from '$app/state'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import LikeButton from '$lib/components/player/buttons/LikeButton.svelte'
	import PlayNextButton from '$lib/components/player/buttons/PlayNextButton.svelte'
	import PlayPrevButton from '$lib/components/player/buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from '$lib/components/player/buttons/PlayTogglePillButton.svelte'
	import RepeatButton from '$lib/components/player/buttons/RepeatButton.svelte'
	import ShuffleButton from '$lib/components/player/buttons/ShuffleButton.svelte'
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import Timeline from '$lib/components/player/Timeline.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { formatArtists } from '$lib/helpers/utils/text.ts'
	import { useMainStore } from '$lib/stores/main/use-store.ts'
	import { usePlayer } from '$lib/stores/player/use-store.ts'

	const { data } = $props()

	const mainStore = useMainStore()
	const player = usePlayer()
	const track = $derived(player.activeTrack)

	const sizes = $derived.by(data.sizes)
	const isCompactVertical = $derived(sizes.isCompactVertical)
	const layoutMode = $derived(data.layoutMode(sizes.isCompact, page.url.pathname))

	// Tab state for queue/playlists
	let activeTab = $state<'queue' | 'playlists'>('queue')

	// Use actual YTM playlists instead of API endpoint
	const playlists = $derived(player.userPlaylists)

	// Function to load playlist via YTM
	const loadPlaylist = async (playlistId: string) => {
		console.log('Loading playlist:', playlistId)
		if (!player.isConnected) {
			console.warn('Not connected to YTM Desktop')
			return
		}
		
		try {
			// Send command to YTM to load playlist
			await player.loadPlaylist(playlistId)
			// Switch back to queue tab to see the loaded tracks
			activeTab = 'queue'
		} catch (error) {
			console.error('Failed to load playlist:', error)
		}
	}
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
			<div class="w-10"></div>

			<div class="text-title-lg">{m.player()}</div>

			<IconButton 
				tooltip="Settings"
				icon="moreVertical"
				as="a" 
				href="/settings"
			/>
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
						<IconButton 
							icon="volumeMid" 
							tooltip="Decrease volume" 
							onclick={() => {
								const newVolume = Math.max(0, player.volume - 10)
								player.setVolume(newVolume)
							}}
						/>

						<Slider bind:value={player.volume} />

						<IconButton 
							icon="volumeHigh" 
							tooltip="Increase volume"
							onclick={() => {
								const newVolume = Math.min(100, player.volume + 10)
								player.setVolume(newVolume)
							}}
						/>
					</div>
				{/if}
			</div>

			<div class="flex h-18 w-full shrink-0 items-center rounded-2xl bg-secondaryContainer px-4">
				{#if track}
					<div class="grid overflow-hidden flex-1">
						<div class="truncate text-body-lg">{track.title}</div>
						<div class="truncate text-body-md">{formatArtists(track.artists)}</div>
					</div>
				{/if}

				<div class="ml-auto flex gap-1">
					<LikeButton />

					{#if layoutMode === 'list'}
						<IconButton tooltip={m.playerOpenQueue()} icon="trayFull" as="a" href="/player/queue" />
					{/if}
				</div>
			</div>
		</div>
	</div>
{/snippet}


{#snippet queueSnippet()}
	{#if layoutMode === 'details'}
		<Header title="Music"></Header>
	{/if}

	<div class="flex w-full grow flex-col">
		{#if layoutMode !== 'details'}
			<div class="flex h-16 items-center border-b border-onSecondaryContainer/24 px-4">
				<div class="w-10"></div>

				<div class="mx-auto text-title-lg">
					Music
				</div>

				<div class="w-10"></div>
			</div>
		{/if}

		<!-- Tabs -->
		<div class="flex gap-2 p-2 bg-secondaryContainer">
			<button 
				class="flex-1 py-3 px-4 text-center font-medium transition-all duration-200 rounded-xl {activeTab === 'queue' ? 'bg-primary text-onPrimary shadow-md' : 'text-onSurfaceVariant hover:bg-surfaceContainerHigh hover:text-onSurface'}"
				onclick={() => activeTab = 'queue'}
			>
				Queue ({player.queue.length})
			</button>
			<button 
				class="flex-1 py-3 px-4 text-center font-medium transition-all duration-200 rounded-xl {activeTab === 'playlists' ? 'bg-primary text-onPrimary shadow-md' : 'text-onSurfaceVariant hover:bg-surfaceContainerHigh hover:text-onSurface'}"
				onclick={() => activeTab = 'playlists'}
			>
				Playlists ({playlists.length})
			</button>
		</div>

		<div class="flex grow p-4">
			{#if activeTab === 'queue'}
				{#if player.isQueueEmpty}
					<div class="m-auto flex flex-col items-center text-center">
						<!-- Connection Status Debug -->
						<div class="mb-4 p-4 bg-surfaceContainer rounded w-full max-w-md">
							<h3 class="font-bold mb-2">YTM Connection Status</h3>
							<div class="text-left text-sm space-y-1">
								<p>Connected: <span class="font-mono">{player.isConnected}</span></p>
								<p>Error: <span class="font-mono">{player.connectionError || 'None'}</span></p>
								<p>Current Track: <span class="font-mono">{player.activeTrack?.title || 'None'}</span></p>
								<p>Queue Length: <span class="font-mono">{player.queue.length}</span></p>
							</div>
							<div class="mt-3 flex gap-2">
								<Button 
									kind="outlined" 
									onclick={() => player.resetConnection()}
								>
									Reset Connection
								</Button>
								<Button 
									kind="toned" 
									onclick={() => player.forceReconnect()}
								>
									Force Reconnect
								</Button>
							</div>
						</div>

						<Icon
							type="playlistMusic"
							class="color-onSecondaryContainer my-auto size-35 opacity-54"
						/>

						<div class="mb-4 text-body-lg">
							{#if !player.isConnected}
								Connect to YouTube Music Desktop to start playing
							{:else}
								No music playing. Start playing music in YouTube Music Desktop.
							{/if}
						</div>
						<Button kind="outlined" as="a" href="/settings">
							Open Settings
						</Button>
					</div>
				{:else}
					<!-- YTM Queue Display -->
					<div class="flex flex-col gap-2 w-full">
						{#each player.queue as track, index}
							<button 
								class="flex items-center gap-3 p-2 rounded bg-surfaceContainer hover:bg-surfaceContainerHigh transition-colors cursor-pointer w-full text-left {index === player.activeTrackIndex ? 'ring-2 ring-primary' : ''}"
								onclick={() => player.playTrackAtIndex(index)}
							>
								{#if track.thumbnail}
									<img src={track.thumbnail} alt={track.title} class="w-12 h-12 rounded" />
								{:else}
									<div class="w-12 h-12 rounded bg-surfaceContainerHigh flex items-center justify-center text-onSurfaceVariant">🎵</div>
								{/if}
								<div class="flex-1">
									<div class="font-medium">{track.title}</div>
									<div class="text-sm text-onSurfaceVariant">{formatArtists(track.artists)}</div>
								</div>
								{#if index === player.activeTrackIndex}
									<div class="text-primary text-sm flex items-center gap-1">
										<span class="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
										Now Playing
									</div>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'playlists'}
				<!-- Playlists Tab Content -->
				<div class="flex flex-col gap-2 w-full">
					{#if !player.isConnected}
						<div class="m-auto flex flex-col items-center text-center">
							<Icon
								type="playlistMusic"
								class="color-onSecondaryContainer my-auto size-35 opacity-54"
							/>
							<div class="mb-4 text-body-lg">Connect to YouTube Music Desktop to see your playlists</div>
							<Button kind="outlined" as="a" href="/settings">
								Open Settings
							</Button>
						</div>
					{:else if playlists.length === 0}
						<div class="m-auto flex flex-col items-center text-center">
							<Icon
								type="playlistMusic"
								class="color-onSecondaryContainer my-auto size-35 opacity-54"
							/>
							<div class="mb-4 text-body-lg">No playlists found</div>
							<Button kind="outlined" onclick={() => player.forceReconnect()}>
								Refresh Connection
							</Button>
						</div>
					{:else}
						{#each playlists as playlist}
							<button 
								class="flex items-center gap-3 p-3 rounded bg-surfaceContainer hover:bg-surfaceContainerHigh transition-colors cursor-pointer w-full text-left"
								onclick={() => loadPlaylist(playlist.id)}
							>
								{#if playlist.thumbnail}
									<img src={playlist.thumbnail} alt={playlist.title} class="w-12 h-12 rounded" />
								{:else}
									<div class="w-12 h-12 rounded bg-surfaceContainerHigh flex items-center justify-center text-onSurfaceVariant">🎵</div>
								{/if}
								<div class="flex-1">
									<div class="font-medium">{playlist.title}</div>
									<div class="text-sm text-onSurfaceVariant">
										{playlist.author}
									</div>
								</div>
								<Icon type="playlistMusic" class="w-5 h-5 text-onSurfaceVariant" />
							</button>
						{/each}
					{/if}
				</div>
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
				view-player-container-rounded 400ms var(--ease-standard),
				var(--vt-pl-card-morph-ani) 400ms var(--ease-standard);
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
			animation-timing-function: var(--ease-standard);
		}
	}
</style>
