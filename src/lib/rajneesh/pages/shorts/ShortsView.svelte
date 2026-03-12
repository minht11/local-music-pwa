<script lang="ts">
	import { goto } from '$app/navigation'
	import { tick } from 'svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { trackShortLiked } from '$lib/rajneesh/analytics/posthog.ts'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { getCachedBlob } from '$lib/rajneesh/index.ts'
	import {
		lastShortsIndex,
		lastShortsTotalCount,
		savedPlaybackTime,
		setLastShortsIndex,
		setSavedPlaybackTime,
	} from './shorts-state.ts'
	import { ensureShortByTrackId, getShortsItems, loadMoreShorts } from './shorts-data.ts'
	import { getLikedTrackIds, setTrackLiked } from './shorts-liked-state.ts'
	import {
		BG_MUSIC_OPTIONS,
		getSelectedBgMusic,
		setSelectedBgMusic,
		getBgMusicVolume,
		setBgMusicVolume,
	} from './bg-music-state.ts'

	const player = usePlayer()
	if (player.playing) {
		player.playing = false
	}

	let shorts = $state(getShortsItems())

	const LOAD_MORE_THRESHOLD = 5
	const SCROLL_TIP_KEY = 'shorts-scroll-tip-shown'

	let viewportEl: HTMLDivElement
	let activeIndex = $state<number>(-1)
	let isLoading = $state(true)
	let autoplayBlocked = $state(false)
	let showScrollTip = $state(!localStorage.getItem(SCROLL_TIP_KEY))
	let observer: IntersectionObserver | null = null

	let selectedBgMusicId = $state(getSelectedBgMusic())
	let showBgMusicPicker = $state(false)
	let bgAudio: HTMLAudioElement | null = null
	let bgMusicPlaying = $state(false)
	let bgVolume = $state(getBgMusicVolume())
let lastThemeAppliedForIndex = -1
let lastUrlUpdatedForIndex = -1
let initialQueryIndex: number | null = null
let isCurrentAudioPlaying = $state(false)
let singleTapTimeout: ReturnType<typeof setTimeout> | null = null
let likeBurstTimeout: ReturnType<typeof setTimeout> | null = null
let likedTrackIds = $state(new Set<string>())
let likeBurstVisible = $state(false)
let likeBurstSeed = $state(0)
let currentPlaybackTime = $state(0)

const HEART_BURST_OFFSETS = [
	{ x: 0, y: -96, delay: 0, scale: 1.2 },
	{ x: 84, y: -54, delay: 0.04, scale: 0.9 },
	{ x: 96, y: 14, delay: 0.08, scale: 1 },
	{ x: 58, y: 86, delay: 0.12, scale: 0.85 },
	{ x: -58, y: 86, delay: 0.16, scale: 0.9 },
	{ x: -96, y: 14, delay: 0.2, scale: 1.1 },
	{ x: -84, y: -54, delay: 0.24, scale: 0.8 },
	{ x: 0, y: 0, delay: 0.06, scale: 1.35 },
]

const activeTrackLiked = $derived(
	activeIndex >= 0 && !!shorts[activeIndex] && likedTrackIds.has(shorts[activeIndex].trackId)
)

function formatTimestamp(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

function hslToHex(h: number, s: number, l: number): string {
	const saturation = s / 100
	const lightness = l / 100
	const k = (n: number) => (n + h / 30) % 12
	const a = saturation * Math.min(lightness, 1 - lightness)
	const f = (n: number) =>
		Math.round(255 * (lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
	return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function getRandomThemeHex(): string {
	const hue = Math.floor(Math.random() * 360)
	return hslToHex(hue, 72, 52)
}

function applyRandomThemeColor() {
	const mainStore = useMainStore()
	const randomHex = getRandomThemeHex()
	void import('$lib/theme.ts').then(({ updateThemeCssVariables }) => {
		updateThemeCssVariables(randomHex, mainStore.isThemeDark)
	})
}

function updateShortsQueryParams(index: number) {
	const item = shorts[index]
	if (!item) return
	const url = new URL(window.location.href)
	url.searchParams.set('trackId', item.trackId)
	url.searchParams.set('startFrom', String(item.startSeconds))
	history.replaceState(history.state, '', url)
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
	setLastShortsIndex(index)
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

async function toggleLikeActiveShort() {
	const item = shorts[activeIndex]
	if (!item) return

	const willLike = !likedTrackIds.has(item.trackId)
	await setTrackLiked(item.trackId, willLike)

	const next = new Set(likedTrackIds)
	if (willLike) {
		next.add(item.trackId)
		triggerLikeBurst()
		trackShortLiked({ trackId: item.trackId })
	} else {
		next.delete(item.trackId)
	}
	likedTrackIds = next
}

function triggerLikeBurst() {
	likeBurstSeed += 1
	likeBurstVisible = true
	if (likeBurstTimeout) clearTimeout(likeBurstTimeout)
	likeBurstTimeout = setTimeout(() => {
		likeBurstVisible = false
		likeBurstTimeout = null
	}, 1300)
}

	function selectBgMusic(id: string) {
		selectedBgMusicId = id
		setSelectedBgMusic(id)
		showBgMusicPicker = false

		if (bgAudio) {
			bgAudio.pause()
			bgAudio.removeAttribute('src')
			bgAudio.load()
			bgAudio = null
			bgMusicPlaying = false
		}

		const option = BG_MUSIC_OPTIONS.find((o) => o.id === id)
		if (option?.url && currentAudio && !currentAudio.paused) {
			bgAudio = new Audio(option.url)
			bgAudio.loop = true
			bgAudio.volume = bgVolume
			bgAudio.play().then(() => {
				bgMusicPlaying = true
			}).catch(() => {
				bgMusicPlaying = false
			})
		}
	}

	function syncBgMusic() {
		const option = BG_MUSIC_OPTIONS.find((o) => o.id === selectedBgMusicId)
		if (!option?.url) {
			if (bgAudio) {
				bgAudio.pause()
				bgAudio = null
			}
			bgMusicPlaying = false
			return
		}

		if (!bgAudio) {
			bgAudio = new Audio(option.url)
			bgAudio.loop = true
			bgAudio.volume = bgVolume
			bgAudio.addEventListener('loadedmetadata', () => {
				if (bgAudio) bgAudio.currentTime = Math.random() * bgAudio.duration
			}, { once: true })
		}
		bgAudio.play().then(() => {
			bgMusicPlaying = true
		}).catch(() => {
			bgMusicPlaying = false
		})
	}

	function pauseBgMusic() {
		bgAudio?.pause()
		bgMusicPlaying = false
	}

	function onBgVolumeChange() {
		setBgMusicVolume(bgVolume)
		if (bgAudio) bgAudio.volume = bgVolume
	}

	function destroyBgMusic() {
		if (bgAudio) {
			bgAudio.pause()
			bgAudio.removeAttribute('src')
			bgAudio.load()
			bgAudio = null
		}
		bgMusicPlaying = false
	}

	$effect(() => {
		if (showScrollTip && activeIndex > 0) {
			showScrollTip = false
			localStorage.setItem(SCROLL_TIP_KEY, '1')
		}
	})

	const audioPool = new Map<number, HTMLAudioElement>()
	let currentAudio: HTMLAudioElement | null = null

	function maybeLoadMore(index: number) {
		if (index >= shorts.length - LOAD_MORE_THRESHOLD) {
			loadMoreShorts()
			shorts = getShortsItems()
		}
	}

	async function getOrCreateAudio(index: number): Promise<HTMLAudioElement> {
		let audio = audioPool.get(index)
		if (audio) return audio
		audio = new Audio()
		audio.preload = 'auto'
		audio.crossOrigin = 'anonymous'
		const { url, startSeconds } = shorts[index]
		const cachedBlob = await getCachedBlob(url)
		if (cachedBlob) {
			audio.src = URL.createObjectURL(cachedBlob)
		} else {
			audio.src = url
		}
		audio.currentTime = startSeconds
		audioPool.set(index, audio)
		return audio
	}

	function cleanupPoolAudio(audio: HTMLAudioElement) {
		audio.pause()
		if (audio.src.startsWith('blob:')) {
			URL.revokeObjectURL(audio.src)
		}
		audio.removeAttribute('src')
		audio.load()
	}

	function preloadAdjacent(index: number) {
		for (const i of [index - 1, index + 1]) {
			if (i >= 0 && i < shorts.length && !audioPool.has(i)) {
				void getOrCreateAudio(i)
			}
		}
		for (const [key, audio] of audioPool) {
			if (Math.abs(key - index) > 1) {
				cleanupPoolAudio(audio)
				audioPool.delete(key)
			}
		}
	}

	async function playSlide(index: number) {
		if (index < 0 || index >= shorts.length) return

		if (currentAudio) {
			currentAudio.pause()
		}

		isLoading = true
		isCurrentAudioPlaying = false
		pauseBgMusic()
		const audio = await getOrCreateAudio(index)
		if (activeIndex !== index) return
		currentAudio = audio

		audio.ontimeupdate = () => {
			if (currentAudio === audio) {
				currentPlaybackTime = audio.currentTime
			}
		}
		audio.onplaying = () => {
			if (currentAudio === audio) {
				isLoading = false
				isCurrentAudioPlaying = true
				currentPlaybackTime = audio.currentTime
				syncBgMusic()
			}
		}
		audio.onwaiting = () => {
			if (currentAudio === audio) {
				isLoading = true
				isCurrentAudioPlaying = false
				pauseBgMusic()
			}
		}
		audio.onpause = () => {
			if (currentAudio === audio) {
				isCurrentAudioPlaying = false
				pauseBgMusic()
			}
		}
		audio.onended = () => {
			if (currentAudio === audio) {
				isCurrentAudioPlaying = false
			}
		}
		audio.onerror = () => {
			if (currentAudio === audio) {
				isLoading = false
				isCurrentAudioPlaying = false
				pauseBgMusic()
				snackbar({
					id: 'shorts-playback-error',
					message: m.errorPlaybackFailed(),
					duration: 4000,
				})
			}
		}

		if (savedPlaybackTime !== null && index === lastShortsIndex) {
			audio.currentTime = savedPlaybackTime
			setSavedPlaybackTime(null)
		} else {
			audio.currentTime = shorts[index].startSeconds
		}
		currentPlaybackTime = audio.currentTime
		audio.play().catch((err) => {
			isCurrentAudioPlaying = false
			if (err.name === 'NotAllowedError') {
				isLoading = false
				autoplayBlocked = true
			}
		})

		preloadAdjacent(index)
	}

function handleSingleTapToggle() {
		if (autoplayBlocked) {
			autoplayBlocked = false
			if (activeIndex >= 0) playSlide(activeIndex)
			return
		}

		if (!currentAudio && activeIndex >= 0) {
			playSlide(activeIndex)
			return
		}

		if (!currentAudio) return

	if (currentAudio.paused) {
			isLoading = true
			void currentAudio.play().catch((err) => {
				isCurrentAudioPlaying = false
				isLoading = false
				if (err?.name === 'NotAllowedError') autoplayBlocked = true
			})
			return
		}

	if (isLoading) {
		return
	}

		currentAudio.pause()
		isCurrentAudioPlaying = false
		isLoading = false
		pauseBgMusic()
	}

function handleUserTap(event: MouseEvent) {
	if (showBgMusicPicker) {
		showBgMusicPicker = false
		return
	}

	// Double-tap: like/unlike current short.
	if (event.detail === 2) {
		if (singleTapTimeout) {
			clearTimeout(singleTapTimeout)
			singleTapTimeout = null
		}
		void toggleLikeActiveShort()
		return
	}

	// Single-tap: play/pause toggle (deferred to avoid firing on double-tap).
	if (event.detail === 1) {
		singleTapTimeout = setTimeout(() => {
			handleSingleTapToggle()
			singleTapTimeout = null
		}, 220)
	}
}

	function destroyPool() {
		if (currentAudio && activeIndex >= 0) {
			setSavedPlaybackTime(currentAudio.currentTime)
		}
		destroyBgMusic()
		isCurrentAudioPlaying = false
		for (const [, audio] of audioPool) {
			cleanupPoolAudio(audio)
		}
		audioPool.clear()
		currentAudio = null
	}

	function scrollToSlide(index: number) {
		if (index < 0 || index >= shorts.length || !viewportEl) return
		viewportEl.scrollTo({ top: index * viewportEl.clientHeight, behavior: 'smooth' })
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
		if (activeIndex < 0 || activeIndex === lastThemeAppliedForIndex) return
		lastThemeAppliedForIndex = activeIndex
		applyRandomThemeColor()
	})

	$effect(() => {
		if (activeIndex < 0 || activeIndex === lastUrlUpdatedForIndex) return
		lastUrlUpdatedForIndex = activeIndex
		updateShortsQueryParams(activeIndex)
	})

	$effect(() => {
		let cancelled = false
		void getLikedTrackIds().then((ids) => {
			if (cancelled) return
			likedTrackIds = new Set(ids)
		})
		return () => {
			cancelled = true
		}
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

	$effect(() => {
		hydrateFromQuery()
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
		if (activeIndex >= 0) playSlide(activeIndex)
	})

	$effect(() => () => destroyPool())

	$effect(() => () => {
		if (!singleTapTimeout) return
		clearTimeout(singleTapTimeout)
		singleTapTimeout = null
	})

	$effect(() => () => {
		if (!likeBurstTimeout) return
		clearTimeout(likeBurstTimeout)
		likeBurstTimeout = null
	})

	$effect(() => {
		const ms = navigator.mediaSession
		if (activeIndex < 0 || !shorts[activeIndex]) {
			ms.metadata = null
			return
		}
		const item = shorts[activeIndex]
		ms.metadata = new MediaMetadata({
			title: `${item.albumName} - ${item.trackIndex}`,
			artist: 'Osho',
			album: item.albumName,
			artwork: [{
				src: new URL('/artwork.svg', location.origin).toString(),
				sizes: '512x512',
			}],
		})
	})

	$effect(() => {
		navigator.mediaSession.playbackState = isCurrentAudioPlaying ? 'playing' : 'paused'
	})

	$effect(() => {
		const ms = navigator.mediaSession
		const setHandler = ms.setActionHandler.bind(ms)

		setHandler('play', () => {
			if (autoplayBlocked) {
				autoplayBlocked = false
				if (activeIndex >= 0) playSlide(activeIndex)
				return
			}
			if (currentAudio?.paused) {
				void currentAudio.play()
			}
		})
		setHandler('pause', () => {
			if (currentAudio && !currentAudio.paused) {
				currentAudio.pause()
				isCurrentAudioPlaying = false
				pauseBgMusic()
			}
		})
		setHandler('nexttrack', () => {
			if (activeIndex < shorts.length - 1) scrollToSlide(activeIndex + 1)
		})
		setHandler('previoustrack', () => {
			if (activeIndex > 0) scrollToSlide(activeIndex - 1)
		})
		setHandler('seekbackward', () => {
			if (currentAudio) currentAudio.currentTime = Math.max(currentAudio.currentTime - 10, 0)
		})
		setHandler('seekforward', () => {
			if (currentAudio) {
				currentAudio.currentTime = Math.min(
					currentAudio.currentTime + 10,
					currentAudio.duration || Infinity,
				)
			}
		})

		return () => {
			setHandler('play', player.togglePlay.bind(null, true))
			setHandler('pause', player.togglePlay.bind(null, false))
			setHandler('previoustrack', player.playPrev)
			setHandler('nexttrack', player.playNext)
			setHandler('seekbackward', () => player.seek(Math.max(player.currentTime - 10, 0)))
			setHandler('seekforward', () => player.seek(player.currentTime + 10))
			ms.metadata = null
			ms.playbackState = 'none'
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
							{#if activeIndex === i && likeBurstVisible}
								{#key likeBurstSeed}
									<div class="like-burst-layer">
										{#each HEART_BURST_OFFSETS as burst}
											<div
												class="like-burst-heart"
												style={`--like-tx:${burst.x}px;--like-ty:${burst.y}px;--like-delay:${burst.delay}s;--like-scale:${burst.scale};`}
											>
												<Icon type="favorite" class="size-full" />
											</div>
										{/each}
									</div>
								{/key}
							{/if}

							<Icon
								type="vinylDisc"
								class={[
									'size-24 opacity-70 sm:size-32',
									activeIndex === i && 'disc-spin',
									activeIndex === i && isCurrentAudioPlaying && 'disc-spin-playing',
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

							{#if activeIndex === i && !isCurrentAudioPlaying && !isLoading && !autoplayBlocked}
								<span class="text-body-md opacity-70">Paused</span>
							{/if}

							{#if activeIndex === i && autoplayBlocked}
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
					onclick={() => selectBgMusic(option.id)}
					class={[
						'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-sm transition-colors',
						selectedBgMusicId === option.id
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

			{#if selectedBgMusicId !== 'none'}
				<div class="mt-1 border-t border-onSurface/10 px-1 pt-3 pb-1">
					<div class="flex items-center gap-2">
						<Icon type="volumeMid" class="size-3.5 shrink-0 opacity-50" />
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							bind:value={bgVolume}
							oninput={onBgVolumeChange}
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
				bgMusicPlaying
					? 'bg-secondaryContainer/90 text-onSecondaryContainer'
					: 'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon
				type="vinylDisc"
				class={['size-5 disc-spin-bg', bgMusicPlaying && 'disc-spin-bg-playing']}
			/>
		</button>

		<button
			onclick={toggleLikeActiveShort}
			class={[
				'flex size-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors hover:bg-surfaceContainerHigh',
				activeTrackLiked
					? 'bg-secondaryContainer/90 text-onSecondaryContainer'
					: 'bg-surfaceContainer/80 text-onSurface/70',
			]}
		>
			<Icon type={activeTrackLiked ? 'favorite' : 'favoriteOutline'} class="size-5" />
		</button>

		<button
			onclick={handleShareShort}
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
		animation-play-state: paused;
	}
	:global(.disc-spin-playing) {
		animation-play-state: running;
	}
	:global(.disc-spin-bg) {
		animation: spin 3s linear infinite;
		animation-play-state: paused;
	}
	:global(.disc-spin-bg-playing) {
		animation-play-state: running;
	}
	.like-burst-layer {
		position: absolute;
		inset: -10%;
		pointer-events: none;
	}
	.like-burst-heart {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 26px;
		height: 26px;
		transform: translate(-50%, -50%) scale(0.2);
		opacity: 0;
		color: var(--color-onSecondaryContainer);
		animation: like-burst 1s cubic-bezier(0.18, 0.85, 0.24, 1) forwards;
		animation-delay: var(--like-delay, 0s);
	}
	@keyframes like-burst {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.2);
		}
		14% {
			opacity: 1;
		}
		50% {
			opacity: 1;
			transform:
				translate(
					calc(-50% + var(--like-tx, 0px)),
					calc(-50% + var(--like-ty, 0px))
				)
				scale(var(--like-scale, 1));
		}
		100% {
			opacity: 0;
			transform:
				translate(
					calc(-50% + calc(var(--like-tx, 0px) * 1.15)),
					calc(-50% + calc(var(--like-ty, 0px) * 1.15))
				)
				scale(calc(var(--like-scale, 1) * 0.5));
		}
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
