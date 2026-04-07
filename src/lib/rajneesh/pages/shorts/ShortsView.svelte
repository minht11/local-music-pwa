<script lang="ts">
	import { goto, replaceState } from '$app/navigation'
	import { onMount, tick } from 'svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { getLatestActiveMinutesByTrack } from '$lib/db/active-minutes.ts'
	import { onDatabaseChange } from '$lib/db/events.ts'
	import { dbGetAlbumTracksIdsByName, getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
	import { getLibraryValue } from '$lib/library/get/value.ts'
	import { createBookmark } from '$lib/rajneesh/bookmarks/bookmarks.ts'
	import {
		ensureCompletedTracksLoaded,
		isTrackCompleted,
	} from '$lib/stores/completed-tracks.svelte.ts'
	import {
		lastShortsIndex,
		lastShortsTotalCount,
		setLastShortsIndex,
	} from './shorts-state.ts'
	import { ensureShortByTrackId, getShortsItems, loadMoreShorts } from './shorts-data.ts'
	import { BG_MUSIC_OPTIONS } from './bg-music-state.ts'
	import {
		bgMusicState,
		initializeBgMusic,
		pauseBgMusic,
		retainBgMusicConsumer,
		selectBgMusic,
		syncBgMusic,
		updateBgMusicVolume,
	} from '$lib/rajneesh/stores/bg-music.svelte.ts'

	const player = usePlayer()
	const main = useMainStore()

	let shorts = $state(getShortsItems())

	const LOAD_MORE_THRESHOLD = 5
	const SCROLL_TIP_KEY = 'shorts-scroll-tip-shown'
	const QUICK_EXIT_RESTORE_THRESHOLD_MS = 30_000

	type QuickExitRestoreTarget = {
		queue: number[]
		startIndex: number
		startTimeSeconds: number
	}

	let viewportEl: HTMLDivElement
	let activeIndex = $state<number>(-1)
	let showScrollTip = $state(!localStorage.getItem(SCROLL_TIP_KEY))
	let observer: IntersectionObserver | null = null

	let showBgMusicPicker = $state(false)
	let lastUrlUpdatedForIndex = -1
	let initialQueryIndex: number | null = null
	let singleTapTimeout: ReturnType<typeof setTimeout> | null = null
	let activateShortTimeout: ReturnType<typeof setTimeout> | null = null
	let pendingShortTrackId = $state<string | null>(null)
	let lastActivatedShortKey = $state('')
	let resumeSecondsByTrack = $state(new Map<string, number>())
	let shortsSessionStartedAt = 0
	let quickExitRestoreTriggered = false
	let quickExitRestoreInFlight: Promise<void> | null = null
	let skipQuickExitRestore = false
	let quickExitRestoreTarget: QuickExitRestoreTarget | null = null
	let quickExitRestoreTargetPromise: Promise<QuickExitRestoreTarget | null> | null = null

	initializeBgMusic()

	$effect(() => {
		const releaseConsumer = retainBgMusicConsumer()
		return releaseConsumer
	})

	const activeShort = $derived(activeIndex >= 0 ? shorts[activeIndex] : undefined)
	const isShortActiveInPlayer = $derived(activeShort?.trackId === player.activeTrack?.uuid)
	const isCurrentAudioPlaying = $derived(
		isShortActiveInPlayer && player.playing && !player.loading && !pendingShortTrackId,
	)
	const hasPlaybackError = $derived(
		isShortActiveInPlayer && !!player.playbackError && !pendingShortTrackId,
	)
	const isLoading = $derived(
		(isShortActiveInPlayer && player.loading)
		|| (!!pendingShortTrackId && pendingShortTrackId === activeShort?.trackId),
	)
	const currentPlaybackTime = $derived(
		isShortActiveInPlayer ? player.currentTime : getShortStartSeconds(activeShort),
	)

	async function resolveQuickExitRestoreTarget(): Promise<QuickExitRestoreTarget | null> {
		await ensureCompletedTracksLoaded()
		const latestMinutes = await getLatestActiveMinutesByTrack()
		const latestMinute = Array.from(latestMinutes.values())
			.filter((minute) => !isTrackCompleted(minute.trackId))
			.sort((a, b) => b.activeMinuteTimestampMs - a.activeMinuteTimestampMs)[0]

		if (!latestMinute) {
			return null
		}

		const trackDbId = await getLibraryItemIdFromUuid('tracks', latestMinute.trackId)
		if (!trackDbId) {
			return null
		}

		const track = await getLibraryValue('tracks', trackDbId, true)
		if (!track) {
			return null
		}

		const albumTrackIds = await dbGetAlbumTracksIdsByName(track.album)
		const startIndex = albumTrackIds.indexOf(trackDbId)

		return {
			queue: albumTrackIds.length > 0 ? albumTrackIds : [trackDbId],
			startIndex: startIndex >= 0 ? startIndex : 0,
			startTimeSeconds: Math.max(0, Math.floor(latestMinute.trackTimestampMs / 1000)),
		}
	}

	function shouldRestoreTrackOnQuickExit(): boolean {
		if (skipQuickExitRestore || quickExitRestoreTriggered || shortsSessionStartedAt <= 0) {
			return false
		}

		const timeOnShortsMs = Date.now() - shortsSessionStartedAt
		if (timeOnShortsMs >= QUICK_EXIT_RESTORE_THRESHOLD_MS) {
			return false
		}

		return player.sourceContext === 'shorts'
	}

	async function restoreTrackOnQuickShortsExit(): Promise<void> {
		if (!shouldRestoreTrackOnQuickExit()) {
			return
		}

		if (quickExitRestoreInFlight) {
			return quickExitRestoreInFlight
		}

		quickExitRestoreInFlight = (async () => {
			const target =
				quickExitRestoreTarget
				?? (quickExitRestoreTargetPromise ? await quickExitRestoreTargetPromise : null)
			if (!target) {
				return
			}

			player.prepareTrack(target.startIndex, target.queue, {
				startTimeSeconds: target.startTimeSeconds,
				sourceContext: 'library',
			})
			quickExitRestoreTriggered = true
		})().finally(() => {
			quickExitRestoreInFlight = null
		})

		return quickExitRestoreInFlight
	}

	function getShortStartSeconds(item: (typeof activeShort) | undefined): number {
		if (!item) {
			return 0
		}

		const savedSeconds = resumeSecondsByTrack.get(item.trackId)
		if (typeof savedSeconds === 'number' && savedSeconds > 0) {
			return savedSeconds
		}

		return item.startSeconds
	}

async function refreshShortsFeed() {
	await ensureCompletedTracksLoaded()
	const latestMinutes = await getLatestActiveMinutesByTrack()
	resumeSecondsByTrack = new Map(
		[...latestMinutes.entries()].map(([trackId, minute]) => [
			trackId,
			Math.max(0, Math.floor(minute.trackTimestampMs / 1000)),
		]),
	)

	let nextShorts = getShortsItems().filter((item) => !isTrackCompleted(item.trackId))
	let attempts = 0
	const minimumVisibleShorts = Math.max(20, activeIndex + 1)

	while (nextShorts.length < minimumVisibleShorts && attempts < 8) {
		loadMoreShorts()
		nextShorts = getShortsItems().filter((item) => !isTrackCompleted(item.trackId))
		attempts += 1
	}

	shorts = nextShorts

	if (shorts.length === 0) {
		activeIndex = -1
		return
	}

	if (activeIndex >= shorts.length) {
		activeIndex = shorts.length - 1
	}
}

function formatTimestamp(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

function updateShortsQueryParams(index: number) {
		const item = shorts[index]
		if (!item) return
		const url = new URL(window.location.href)
		const nextTrackId = item.trackId
		const nextStartFrom = String(getShortStartSeconds(item))
		const currentTrackId = url.searchParams.get('trackId')
		const currentStartFrom = url.searchParams.get('startFrom')

		if (currentTrackId === nextTrackId && currentStartFrom === nextStartFrom) {
			return
		}

		url.searchParams.set('trackId', item.trackId)
		url.searchParams.set('startFrom', nextStartFrom)
		replaceState(url, history.state)
	}

function hydrateFromQuery() {
	const url = new URL(window.location.href)
	const trackId = url.searchParams.get('trackId')?.trim()
	const startFromRaw = url.searchParams.get('startFrom')
	const parsedStartFrom = startFromRaw ? Number(startFromRaw) : undefined
	const startFrom = Number.isFinite(parsedStartFrom) ? parsedStartFrom : undefined
	if (!trackId) return

	const index = ensureShortByTrackId(trackId, startFrom)
	if (index < 0) return

	shorts = getShortsItems()
	initialQueryIndex = index
	setLastShortsIndex(index, shorts.length)
	activeIndex = index
}

async function handleShareShort() {
	const item = shorts[activeIndex]
	if (!item) return
	updateShortsQueryParams(activeIndex)
	const shareUrl = window.location.href
	const shareData = {
		title: 'Shorts',
		text: `${item.albumName} - ${item.trackIndex}`,
		url: shareUrl,
	}

	if (navigator.share) {
		try {
			await navigator.share(shareData)
			return
		} catch (err) {
			if ((err as Error).name === 'AbortError') return
		}
	}

	if (navigator.clipboard?.writeText) {
		void navigator.clipboard.writeText(shareUrl)
	}
}

async function saveBookmarkForActiveShort() {
	const item = shorts[activeIndex]
	if (!item) return

	try {
		const timestampSeconds =
			isShortActiveInPlayer && player.currentTime > 0 ? player.currentTime : getShortStartSeconds(item)
		const bookmarkId = await createBookmark({
			trackId: item.trackDbId,
			timestampSeconds,
		})
		main.bookmarkDialogOpen = { bookmarkId }
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

function addActiveShortToPlayLater() {
	const item = shorts[activeIndex]
	if (!item) return

	player.addToQueue(item.trackDbId)
	snackbar('Added to Play later')
}

	$effect(() => {
		if (showScrollTip && activeIndex > 0) {
			showScrollTip = false
			localStorage.setItem(SCROLL_TIP_KEY, '1')
		}
	})

	function maybeLoadMore(index: number) {
		if (index >= shorts.length - LOAD_MORE_THRESHOLD) {
			loadMoreShorts()
			void refreshShortsFeed()
		}
	}

	function activateShort(index: number, autoplay = true) {
		const item = shorts[index]
		if (!item) return
		if (isTrackCompleted(item.trackId)) {
			void refreshShortsFeed()
			return
		}

		const startSeconds = getShortStartSeconds(item)

		const isSameShortActive =
			player.activeTrack?.uuid === item.trackId
			&& player.sourceContext === 'shorts'
			&& player.sourceStartTimeSeconds === startSeconds

		if (isSameShortActive) {
			pendingShortTrackId = null
			return
		}

		pendingShortTrackId = item.trackId
		if (autoplay) {
			player.playTrack(0, [item.trackDbId], {
				startTimeSeconds: startSeconds,
				sourceContext: 'shorts',
			})
			return
		}

		player.prepareTrack(0, [item.trackDbId], {
			startTimeSeconds: startSeconds,
			sourceContext: 'shorts',
		})
	}

	function handleSingleTapToggle() {
		if (!activeShort) return

		if (!isShortActiveInPlayer) {
			activateShort(activeIndex)
			return
		}

		if (player.playbackError) {
			player.retryPlayback()
			return
		}

		player.togglePlay()
	}

	function handleUserTap(event: MouseEvent) {
		if (showBgMusicPicker) {
			showBgMusicPicker = false
			return
		}

		if (event.detail === 2) {
			if (singleTapTimeout) {
				clearTimeout(singleTapTimeout)
				singleTapTimeout = null
			}
			void saveBookmarkForActiveShort()
			return
		}

		if (event.detail === 1) {
			singleTapTimeout = setTimeout(() => {
				handleSingleTapToggle()
				singleTapTimeout = null
			}, 220)
		}
	}

	function observeSlide(el: HTMLElement) {
		observer?.observe(el)
	}

	$effect(() => {
		if (activeIndex >= 0) {
			setLastShortsIndex(activeIndex, shorts.length)
			maybeLoadMore(activeIndex)
		}
	})

	$effect(() => {
		if (activeIndex < 0 || activeIndex === lastUrlUpdatedForIndex) return
		lastUrlUpdatedForIndex = activeIndex
		updateShortsQueryParams(activeIndex)
	})

	// Ensure we regenerate enough shorts to reach the last seen index.
	$effect(() => {
		if (lastShortsTotalCount <= 0) return
		if (shorts.length >= lastShortsTotalCount) return

		while (shorts.length < lastShortsTotalCount) {
			loadMoreShorts()
			shorts = getShortsItems()
		}
	})

	onMount(() => {
		shortsSessionStartedAt = Date.now()
		quickExitRestoreTargetPromise = resolveQuickExitRestoreTarget().then((target) => {
			quickExitRestoreTarget = target
			return target
		})

		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				void restoreTrackOnQuickShortsExit()
			}
		}

		const onPageHide = () => {
			void restoreTrackOnQuickShortsExit()
		}

		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('pagehide', onPageHide)

		void refreshShortsFeed()
		hydrateFromQuery()

		const releaseDatabaseChangeListener = onDatabaseChange((changes) => {
			for (const change of changes) {
				const storeName = change.storeName as string
				if (storeName === 'completedTracks' || storeName === 'activeMinutes') {
					void refreshShortsFeed()
					return
				}
			}
		})

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('pagehide', onPageHide)
			void restoreTrackOnQuickShortsExit()
			releaseDatabaseChangeListener()
		}
	})

	$effect(() => {
		const el = viewportEl
		if (!el) return
		let cancelled = false
		tick().then(() => {
			if (cancelled) return
			observer?.disconnect()
			observer = new IntersectionObserver(
				(entries) => {
					for (const e of entries) {
						if (e.isIntersecting && e.intersectionRatio >= 0.5) {
							activeIndex = Number((e.target as HTMLElement).dataset.slideIndex)
							break
						}
					}
				},
				{ root: el, threshold: [0.5] },
			)
			el.querySelectorAll('[data-slide-index]').forEach((s) => observer!.observe(s))

			const targetIndex = initialQueryIndex ?? lastShortsIndex
			if (targetIndex >= 0 && targetIndex < shorts.length && el.clientHeight > 0) {
				requestAnimationFrame(() => {
					if (cancelled) return
					el.scrollTo({ top: targetIndex * el.clientHeight, behavior: 'auto' })
					activeIndex = targetIndex
					initialQueryIndex = null
				})
			}
		})
		return () => {
			cancelled = true
			observer?.disconnect()
		}
	})

	$effect(() => {
		if (!activeShort) return

		const shortKey = `${activeShort.trackId}:${getShortStartSeconds(activeShort)}`
		if (shortKey === lastActivatedShortKey) return

		if (activateShortTimeout) {
			clearTimeout(activateShortTimeout)
		}

		activateShortTimeout = setTimeout(() => {
			lastActivatedShortKey = shortKey
			activateShort(activeIndex)
			activateShortTimeout = null
		}, 140)
	})

	$effect(() => () => {
		if (!singleTapTimeout) return
		clearTimeout(singleTapTimeout)
		singleTapTimeout = null
	})

	$effect(() => () => {
		if (!activateShortTimeout) return
		clearTimeout(activateShortTimeout)
		activateShortTimeout = null
	})

	$effect(() => {
		if (pendingShortTrackId && pendingShortTrackId === player.activeTrack?.uuid) {
			pendingShortTrackId = null
		}
	})

	$effect(() => {
		if (isShortActiveInPlayer && player.playing && !player.loading) {
			syncBgMusic()
		} else {
			pauseBgMusic()
		}
	})
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={viewportEl}
	onclick={handleUserTap}
	class="shorts-viewport -mx-4 flex h-[100dvh] min-h-[100dvh] flex-col overflow-y-auto overscroll-y-none bg-surfaceContainerLow"
	style="scroll-snap-type: y mandatory;"
>
	{#if shorts.length === 0}
		<div class="shorts-slide relative flex min-h-[100dvh] shrink-0 items-center justify-center p-6 text-onSurface">
			<div class="w-full max-w-xl rounded-3xl border border-outlineVariant/40 bg-surfaceContainer p-8 text-center shadow-lg">
				<div class="mb-2 text-title-lg">No shorts yet</div>
				<div class="text-body-md opacity-70">
					Add more tracks to your library to unlock random moments here.
				</div>
			</div>
		</div>
	{:else}
		{#each shorts as item, i (i)}
			<div
				data-slide-index={i}
				class="shorts-slide relative flex min-h-[100dvh] shrink-0 flex-col bg-surfaceContainerLow px-6 pb-8 pt-10 text-onSurface"
				use:observeSlide
			>
				<div class="relative z-10 flex min-h-[calc(100dvh-7rem)] w-full flex-col items-center justify-center">
					<div class="mb-6 flex items-center justify-center">
						<div class="relative flex size-56 items-center justify-center rounded-full border border-outlineVariant/45 bg-surfaceContainerHigh shadow-inner sm:size-72">
							<Icon
								type="vinylDisc"
								class={[
									'size-24 opacity-70 sm:size-32',
									activeIndex === i && isCurrentAudioPlaying && 'disc-spin',
								]}
							/>
						</div>
					</div>

					<div class="pb-4 text-center">
						<div class="mb-2 text-headline-lg">
							{item.albumName} - {item.trackIndex}
						</div>
						<div class="mb-6 text-title-sm opacity-80 sm:text-title-md">
							{activeIndex === i ? formatTimestamp(currentPlaybackTime) : formatTimestamp(item.startSeconds)}
						</div>

						<div class="flex flex-wrap items-center justify-center gap-3">
							{#if item.albumUuid}
								<Button
									kind="outlined"
									class="text-body-md"
									onclick={(e) => {
										e.stopPropagation()
										void goto(`/library/albums/${item.albumUuid}`)
									}}
								>
									<Icon type="album" class="size-4" />
									Open Album
								</Button>
							{/if}

							{#if activeIndex === i}
								<Button
									kind="outlined"
									class="text-body-md"
									onclick={(e) => {
										e.stopPropagation()
										skipQuickExitRestore = true
										void goto('/player')
									}}
								>
									<Icon type="play" class="size-4" />
									Open in Player
								</Button>
							{/if}

							{#if activeIndex === i && !isCurrentAudioPlaying && !isLoading && !hasPlaybackError}
								<span class="rounded-full border border-outlineVariant/45 bg-surfaceContainerHigh px-3 py-1.5 text-body-md">
									Tap anywhere to play
								</span>
							{/if}

							{#if activeIndex === i && isLoading}
								<span class="inline-flex items-center gap-2 rounded-full border border-outlineVariant/45 bg-surfaceContainerHigh px-3 py-1.5 text-body-md">
									<div class="loader-inline"></div>
									Loading
								</span>
							{/if}

							{#if activeIndex === i && hasPlaybackError}
								<div class="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-error/30 bg-errorContainer/80 px-3 py-2 text-body-sm text-onErrorContainer">
									<span>{player.playbackError}</span>
									<Button
										kind="outlined"
										class="!h-8 !px-3"
										onclick={(e) => {
											e.stopPropagation()
											player.retryPlayback()
										}}
									>
										<Icon type="cached" class="size-4" />
										Retry
									</Button>
								</div>
							{/if}
						</div>
					</div>
				</div>

				{#if i === 0 && showScrollTip}
					<div class="scroll-tip absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 px-4 py-2 opacity-75">
						<Icon type="chevronUp" class="size-6 animate-bounce" />
						<span class="text-body-sm">Swipe up for more</span>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- Background music picker — pinned bottom-right -->
<div
	class="pointer-events-auto fixed right-4 z-10"
	style="bottom: calc(var(--bottom-overlay-height, 64px) + 12px);"
	onclick={(e) => e.stopPropagation()}
>
	{#if showBgMusicPicker}
		<div class="mb-2 min-w-44 rounded-2xl bg-surfaceContainer/95 px-3 py-3 shadow-xl backdrop-blur-lg">
			<div class="px-3 pb-2 pt-1 text-body-sm font-medium opacity-50">Background Music</div>
			{#each BG_MUSIC_OPTIONS as option (option.id)}
				<button
					onclick={() => selectBgMusic(option.id, player.playing)}
					class={[
						'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-sm transition-colors',
						bgMusicState.selectedBgMusicId === option.id
							? 'bg-secondaryContainer/80 text-onSecondaryContainer'
							: 'text-onSurface/80 hover:bg-onSurface/5',
					]}
				>
					<Icon
						type={option.url ? 'musicNote' : 'close'}
						class="size-4 shrink-0"
					/>
					<span>{option.title}</span>
				</button>
			{/each}

			{#if bgMusicState.selectedBgMusicId !== 'none'}
				<div class="mt-1 border-t border-onSurface/10 px-1 pt-3 pb-1">
					<div class="flex items-center gap-2">
						<Icon type="volumeMid" class="size-3.5 shrink-0 opacity-50" />
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							bind:value={bgMusicState.bgVolume}
							oninput={() => updateBgMusicVolume(bgMusicState.bgVolume)}
							class="bg-music-slider flex-1"
						/>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="flex flex-col items-end gap-3">
		<button
			onclick={() => { showBgMusicPicker = !showBgMusicPicker }}
			class={[
				'flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors',
				bgMusicState.bgMusicPlaying
					? 'bg-secondaryContainer/90 text-onSecondaryContainer'
					: 'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon
				type="vinylDisc"
				class={['size-5 disc-spin-bg', bgMusicState.bgMusicPlaying && 'disc-spin-bg-playing']}
			/>
		</button>

		<button
			onclick={(e) => {
				e.stopPropagation()
				void saveBookmarkForActiveShort()
			}}
			class={[
				'flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors hover:bg-surfaceContainerHigh',
				'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon type="bookmarkOutline" class="size-5" />
		</button>

		<button
			onclick={(e) => {
				e.stopPropagation()
				addActiveShortToPlayLater()
			}}
			class="flex size-10 items-center justify-center rounded-full bg-surfaceContainer/80 text-onSurface/70 shadow-lg backdrop-blur-md transition-colors hover:bg-surfaceContainerHigh"
		>
			<Icon type="playlistMusic" class="size-5" />
		</button>

		<button
			onclick={(e) => {
				e.stopPropagation()
				void handleShareShort()
			}}
			class="flex size-10 items-center justify-center rounded-full bg-surfaceContainer/80 text-onSurface/70 shadow-lg backdrop-blur-md transition-colors hover:bg-surfaceContainerHigh"
		>
			<Icon type="shareVariant" class="size-5" />
		</button>
	</div>
</div>

<style>
	.shorts-viewport {
		-webkit-overflow-scrolling: touch;
		touch-action: pan-y;
	}
	.shorts-slide {
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
	.loader-inline {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-bottom-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	:global(.disc-spin) {
		animation: spin 6s linear infinite;
	}
	:global(.disc-spin-bg) {
		animation: spin 3s linear infinite;
		animation-play-state: paused;
	}
	:global(.disc-spin-bg-playing) {
		animation-play-state: running;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.bg-music-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 3px;
		border-radius: 2px;
		background: currentColor;
		opacity: 0.25;
		outline: none;
	}
	.bg-music-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}
	.bg-music-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border: none;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}
</style>
