<script lang="ts">
	import { tick } from 'svelte'
	import Button from '$lib/components/Button.svelte'
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import {
		extractExcerptAroundMatch,
		highlightExcerpt,
	} from '$lib/rajneesh/transcript/excerpt.ts'
	import { romanToDevanagariForSearch } from '$lib/rajneesh/transcript/roman-to-devanagari.ts'

	interface Props {
		searchTerm: string
	}

	const { searchTerm }: Props = $props()

	const player = usePlayer()

	const PAGE_SIZE = 20

	type PagefindResult = {
		id: string
		data: () => Promise<{
			url: string
			excerpt: string
			meta?: {
				title?: string
				albumName?: string
				trackId?: string
				transcriptPath?: string
			}
		}>
	}

	type DisplayItem = {
		id: string
		excerpt: string
		trackName: string
		albumName: string
		trackId: number
		transcriptPath: string | null
		exactMatch: boolean
	}

	async function processResult(
		result: PagefindResult,
		term: string,
	): Promise<DisplayItem | null> {
		const data = await result.data()
		const trackId = data.meta?.trackId ? parseInt(data.meta.trackId, 10) : undefined
		if (trackId == null || Number.isNaN(trackId)) return null

		let excerpt = data.excerpt ?? ''
		let exactMatch = false
		const transcriptPath = data.meta?.transcriptPath
		if (transcriptPath) {
			try {
				const res = await fetch(transcriptPath)
				if (res.ok) {
					const buffer = await res.arrayBuffer()
					const text = new TextDecoder('utf-8').decode(buffer)
					const { excerpt: customExcerpt, found } = extractExcerptAroundMatch(
						text,
						term,
						{ wordsBefore: 3, linesAfter: 3 },
					)
					if (found) {
						excerpt = highlightExcerpt(customExcerpt, term)
						exactMatch = true
					}
				}
			} catch {
				// Fall back to Pagefind excerpt
			}
		}

		return {
			id: result.id,
			excerpt,
			trackName: data.meta?.title ?? '',
			albumName: data.meta?.albumName ?? '',
			trackId,
			transcriptPath: transcriptPath ?? null,
			exactMatch,
		}
	}

	let loading = $state(true)
	let loadingMore = $state(false)
	let results = $state<DisplayItem[]>([])
	let totalCount = $state(0)
	let rawResults = $state<PagefindResult[]>([])
	let processedResults = $state<Array<DisplayItem | null | undefined>>([])
	let loadedRawCount = $state(0)
	let effectiveSearchTerm = $state('')
	let error = $state<string | null>(null)
	let sentinelEl: HTMLDivElement | null = $state(null)
	let readDialogItem = $state<DisplayItem | null>(null)
	let readDialogLoading = $state(false)
	let readDialogError = $state<string | null>(null)
	let readDialogHtml = $state('')
	let readDialogContentEl: HTMLDivElement | null = $state(null)
	const transcriptCache = new Map<string, string>()
	const currentReadDialogRawIndex = $derived(
		readDialogItem ? processedResults.findIndex((item) => item?.id === readDialogItem?.id) : -1,
	)
	const canOpenPreviousResult = $derived(currentReadDialogRawIndex > 0)
	const canOpenNextResult = $derived(currentReadDialogRawIndex >= 0 && currentReadDialogRawIndex < totalCount - 1)

	async function processRawRange(start: number, end: number, term: string): Promise<DisplayItem[]> {
		const loaded: DisplayItem[] = []

		for (let index = start; index < end; index++) {
			const result = rawResults[index]
			if (!result) continue

			const item = await processResult(result, term)
			processedResults[index] = item
			if (item) {
				loaded.push(item)
			}
		}

		return loaded
	}

	$effect(() => {
		const term = searchTerm.trim()
		if (!term) {
			loading = false
			results = []
			rawResults = []
			processedResults = []
			totalCount = 0
			loadedRawCount = 0
			effectiveSearchTerm = ''
			return
		}

		loading = true
		results = []
		rawResults = []
		processedResults = []
		totalCount = 0
		loadedRawCount = 0
		error = null

		const runSearch = async () => {
			if (typeof document === 'undefined') return
			try {
				const pagefindUrl = new URL('/pagefind/pagefind.js', document.baseURI).href
				const pagefind = await import(/* @vite-ignore */ pagefindUrl)
				await pagefind.options?.({ ranking: { termSimilarity: 2.5 } })
				pagefind.init?.()

				const searchTerms = romanToDevanagariForSearch(term)
				let search = null
				let effectiveTerm = term

				for (const q of searchTerms) {
					search = await pagefind.debouncedSearch(q, {}, 300)
					if (search !== null && (search.results?.length ?? 0) > 0) {
						effectiveTerm = q
						break
					}
				}
				if (search === null) return

				effectiveSearchTerm = effectiveTerm
				const raw = (search.results ?? []) as PagefindResult[]
				rawResults = raw
				processedResults = Array(raw.length).fill(undefined)
				totalCount = raw.length

				const end = Math.min(PAGE_SIZE, raw.length)
				const loaded = await processRawRange(0, end, effectiveTerm)
				loadedRawCount = end
				results = loaded
			} catch (e) {
				error = e instanceof Error ? e.message : String(e)
			} finally {
				loading = false
			}
		}

		void runSearch()
	})

	async function loadMore() {
		if (loadingMore || loading || loadedRawCount >= rawResults.length) return
		loadingMore = true
		const term = effectiveSearchTerm || searchTerm.trim()
		const start = loadedRawCount
		const end = Math.min(start + PAGE_SIZE, rawResults.length)
		try {
			const loaded = await processRawRange(start, end, term)
			loadedRawCount = end
			results = [...results, ...loaded]
		} finally {
			loadingMore = false
		}
	}

	$effect(() => {
		const el = sentinelEl
		if (!el) return
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (entry?.isIntersecting && !loading && !loadingMore && loadedRawCount < rawResults.length) {
					void loadMore()
				}
			},
			{ rootMargin: '200px', threshold: 0 },
		)
		observer.observe(el)
		return () => observer.disconnect()
	})

	const playTrack = (trackId: number) => {
		player.playTrack(0, [trackId])
	}

	const ensureRawResultsProcessedThrough = async (targetIndex: number) => {
		while (targetIndex >= loadedRawCount && loadedRawCount < rawResults.length) {
			const previousLoadedRawCount = loadedRawCount
			await loadMore()
			if (loadedRawCount === previousLoadedRawCount) {
				break
			}
		}
	}

	const closeReadDialog = () => {
		readDialogItem = null
		readDialogLoading = false
		readDialogError = null
		readDialogHtml = ''
		readDialogContentEl = null
	}

	const openReadDialog = async (item: DisplayItem) => {
		readDialogItem = item
		readDialogLoading = true
		readDialogError = null
		readDialogHtml = ''

		if (!item.transcriptPath) {
			readDialogLoading = false
			readDialogError = 'Transcript unavailable for this result.'
			return
		}

		try {
			let transcriptText = transcriptCache.get(item.transcriptPath)
			if (!transcriptText) {
				const res = await fetch(item.transcriptPath)
				if (!res.ok) {
					throw new Error('Could not load transcript.')
				}

				const buffer = await res.arrayBuffer()
				transcriptText = new TextDecoder('utf-8').decode(buffer)
				transcriptCache.set(item.transcriptPath, transcriptText)
			}

			readDialogHtml = highlightExcerpt(transcriptText, effectiveSearchTerm || searchTerm.trim())
		} catch (e) {
			readDialogError = e instanceof Error ? e.message : 'Could not load transcript.'
		} finally {
			readDialogLoading = false
		}
	}

	const openRelativeReadDialog = async (direction: -1 | 1) => {
		if (currentReadDialogRawIndex < 0) {
			return
		}

		let targetIndex = currentReadDialogRawIndex + direction
		while (targetIndex >= 0 && targetIndex < rawResults.length) {
			await ensureRawResultsProcessedThrough(targetIndex)

			const targetItem = processedResults[targetIndex]
			if (targetItem) {
				await openReadDialog(targetItem)
				return
			}

			targetIndex += direction
		}
	}

	$effect(() => {
		const contentEl = readDialogContentEl
		if (!readDialogItem || readDialogLoading || readDialogError || !readDialogHtml || !contentEl) {
			return
		}

		void tick().then(() => {
			const firstMatch = contentEl.querySelector('mark')
			if (firstMatch instanceof HTMLElement) {
				firstMatch.scrollIntoView({
					block: 'center',
					inline: 'nearest',
				})
			}
		})
	})

	$effect(() => {
		if (!readDialogItem || typeof window === 'undefined') {
			return
		}

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft' && canOpenPreviousResult) {
				e.preventDefault()
				void openRelativeReadDialog(-1)
			}

			if (e.key === 'ArrowRight' && canOpenNextResult) {
				e.preventDefault()
				void openRelativeReadDialog(1)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	})
</script>

<div class="flex w-full flex-col gap-4 px-2 pb-8">
	{#if loading}
		<div class="flex flex-col items-center gap-2 py-8 text-onSurfaceVariant">
			<div class="size-8 animate-pulse rounded-full border-2 border-primary border-t-transparent"></div>
			<div class="text-body-md">{m.libraryTranscriptSearching()}</div>
		</div>
	{:else if error}
		<div class="py-8 text-center text-error">{error}</div>
	{:else if results.length === 0}
		<div class="flex flex-col items-center gap-2 py-8 text-center text-onSurfaceVariant">
			<Icon type="magnify" class="size-12 opacity-54" />
			<div class="text-body-lg">{m.libraryTranscriptSearchNoResults()}</div>
		</div>
	{:else}
		<div class="text-body-sm font-medium text-onSurfaceVariant">
			{m.libraryTranscriptSearchResultsCount({ count: totalCount })}
		</div>
		{#if results.length > 0 && !results[0]?.exactMatch}
			<div
				class="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-body-sm text-onSurfaceVariant"
			>
				{m.libraryTranscriptSearchTypeHindiHint()}
			</div>
		{/if}
		<ul class="flex flex-col gap-3" role="list">
			{#each results as item (item.id)}
				<li
					class="flex flex-col gap-2 rounded-lg border border-primary/10 bg-surfaceContainerHigh p-4"
				>
					<div
						class="line-clamp-5 min-h-[4.5rem] whitespace-pre-wrap text-body-md text-onSurface [&_mark]:bg-primary/20 [&_mark]:rounded [&_mark]:px-0.5"
						style="font-family: 'Noto Sans Devanagari', var(--font-sans)"
					>{@html item.excerpt}</div>
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0 flex-1 truncate">
							<div class="truncate font-medium text-onSurface">{item.trackName || m.unknown()}</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<Button kind="outlined" class="!px-4" onclick={() => void openReadDialog(item)}>
								Read
							</Button>
							<Button kind="filled" class="!px-4" onclick={() => playTrack(item.trackId)}>
								<Icon type="play" />
								{m.play()}
							</Button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
		{#if loadedRawCount < rawResults.length}
			<div
				bind:this={sentinelEl}
				class="flex min-h-16 items-center justify-center py-4 text-onSurfaceVariant"
			>
				{#if loadingMore}
					<div class="flex items-center gap-2">
						<div class="size-5 animate-pulse rounded-full border-2 border-primary border-t-transparent"></div>
						<span class="text-body-sm">{m.libraryTranscriptSearchLoadingMore()}</span>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<CommonDialog
	open={{
		get: () => readDialogItem,
		close: closeReadDialog,
	}}
	title={readDialogItem?.trackName || 'Transcript'}
	showCloseButton
	class="max-w-4xl [--dialog-width:calc(100dvw-1rem)] [--dialog-height:calc(100dvh-1rem)] sm:[--dialog-width:--spacing(180)] sm:[--dialog-height:calc(100dvh-3rem)]"
	buttons={[{ title: 'Close' }]}
>
	{#snippet topRight()}
		<IconButton
			icon="play"
			tooltip="Play this result"
			class="size-10 bg-surfaceContainer sm:size-11"
			disabled={!readDialogItem}
			onclick={() => readDialogItem && playTrack(readDialogItem.trackId)}
		/>
		<div class="hidden items-center gap-2 sm:flex">
			<IconButton
				icon="chevronRight"
				tooltip="Previous result"
				class="bg-surfaceContainer [&_svg]:rotate-180"
				disabled={!canOpenPreviousResult || readDialogLoading}
				onclick={() => void openRelativeReadDialog(-1)}
			/>
			<IconButton
				icon="chevronRight"
				tooltip="Next result"
				class="bg-surfaceContainer"
				disabled={!canOpenNextResult || readDialogLoading}
				onclick={() => void openRelativeReadDialog(1)}
			/>
		</div>
	{/snippet}

	{#snippet children()}
		<div class="flex min-h-0 flex-col gap-3">
			{#if currentReadDialogRawIndex >= 0}
				<div class="text-body-sm text-onSurfaceVariant sm:pr-28">
					Result {currentReadDialogRawIndex + 1} of {totalCount}
				</div>
			{/if}

			{#if readDialogItem?.albumName}
				<div class="text-body-sm text-onSurfaceVariant">{readDialogItem.albumName}</div>
			{/if}

			<div class="flex items-center gap-2 sm:hidden">
				<Button
					kind="outlined"
					class="min-w-0 flex-1 !px-3"
					disabled={!canOpenPreviousResult || readDialogLoading}
					onclick={() => void openRelativeReadDialog(-1)}
				>
					Previous
				</Button>
				<Button
					kind="outlined"
					class="min-w-0 flex-1 !px-3"
					disabled={!canOpenNextResult || readDialogLoading}
					onclick={() => void openRelativeReadDialog(1)}
				>
					Next
				</Button>
			</div>

			{#if readDialogLoading}
				<div class="flex items-center gap-2 py-4 text-onSurfaceVariant">
					<div class="size-5 animate-pulse rounded-full border-2 border-primary border-t-transparent"></div>
					<span class="text-body-sm">{m.libraryTranscriptSearching()}</span>
				</div>
			{:else if readDialogError}
				<div class="py-2 text-body-md text-error">{readDialogError}</div>
			{:else}
				<div
					bind:this={readDialogContentEl}
					class="max-h-[64dvh] overflow-y-auto whitespace-pre-wrap pr-1 select-text text-body-md text-onSurface sm:max-h-[70dvh] sm:pr-2 [&_mark]:rounded [&_mark]:bg-primary/20 [&_mark]:px-0.5"
					style="font-family: 'Noto Sans Devanagari', var(--font-sans)"
				>
					{@html readDialogHtml}
				</div>
			{/if}
		</div>
	{/snippet}
</CommonDialog>
