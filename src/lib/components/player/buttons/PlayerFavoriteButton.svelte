<script lang="ts">
	import { tick } from 'svelte'
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import { highlightExcerpt } from '$lib/rajneesh/transcript/excerpt.ts'

	const player = usePlayer()

	const track = $derived(player.activeTrack)

	let dialogOpen = $state(false)
	let loading = $state(false)
	let error = $state<string | null>(null)
	let transcriptHtml = $state('')
	let transcriptContentEl: HTMLDivElement | null = $state(null)

	const buildTranscriptCandidates = (trackUuid: string, trackNo: number, trackOf: number): string[] => {
		const lastDash = trackUuid.lastIndexOf('-')
		if (lastDash === -1) {
			return []
		}

		const prefix = trackUuid.slice(0, lastDash)
		const num = String(trackNo)
		const count = String(trackOf)

		const discourseWidths = Array.from(
			new Set([num.length, count.length, 2, 3].filter((width) => width >= num.length)),
		).sort((a, b) => a - b)
		const rangeWidths = Array.from(new Set([count.length, 2, 3])).sort((a, b) => a - b)

		const discourseSlugs = Array.from(
			new Set([
				`${prefix}-${num}`,
				...discourseWidths.map((width) => `${prefix}-${num.padStart(width, '0')}`),
			]),
		)

		const seriesSlugs = Array.from(
			new Set(
				rangeWidths.flatMap((width) => [
					`${prefix}-by-osho-1-${count.padStart(width, '0')}`,
					`${prefix}-by-osho-${String(1).padStart(width, '0')}-${count.padStart(width, '0')}`,
					`${prefix}-by-osho-${String(1).padStart(width, '0')}-${count}`,
				]),
			),
		)

		return seriesSlugs.flatMap((seriesSlug) =>
			discourseSlugs.map((discourseSlug) => `/rajneesh/transcripts/${seriesSlug}/${discourseSlug}.txt`),
		)
	}

	const openTranscript = async () => {
		if (!track) {
			return
		}

		dialogOpen = true
		loading = true
		error = null
		transcriptHtml = ''

		try {
			const candidates = buildTranscriptCandidates(track.uuid, track.trackNo, track.trackOf)
			let transcriptText: string | null = null

			for (const candidate of candidates) {
				const response = await fetch(candidate)
				if (!response.ok) {
					continue
				}

				const buffer = await response.arrayBuffer()
				transcriptText = new TextDecoder('utf-8').decode(buffer)
				break
			}

			if (!transcriptText) {
				throw new Error('Transcript unavailable for this discourse.')
			}

			transcriptHtml = highlightExcerpt(transcriptText, '')
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load transcript.'
		} finally {
			loading = false
		}
	}

	const closeTranscript = () => {
		dialogOpen = false
		loading = false
		error = null
		transcriptHtml = ''
		transcriptContentEl = null
	}

	$effect(() => {
		const contentEl = transcriptContentEl
		if (!dialogOpen || loading || error || !transcriptHtml || !contentEl) {
			return
		}

		void tick().then(() => {
			contentEl.scrollTop = 0
		})
	})
</script>

<IconButton
	tooltip="Read transcript"
	disabled={!track}
	onclick={() => void openTranscript()}
	icon="fileDocumentOutline"
/>

<CommonDialog
	bind:open={dialogOpen}
	title={track?.name || 'Transcript'}
	showCloseButton
	class="max-w-4xl [--dialog-width:calc(100dvw-1rem)] [--dialog-height:calc(100dvh-1rem)] sm:[--dialog-width:--spacing(180)] sm:[--dialog-height:calc(100dvh-3rem)]"
	buttons={[{ title: 'Close' }]}
>
	{#snippet topRight()}
		<IconButton
			icon="play"
			tooltip="Play this discourse"
			class="size-10 bg-surfaceContainer sm:size-11"
			disabled={!track}
			onclick={() => track && player.togglePlay(true)}
		/>
	{/snippet}

	{#snippet children()}
		<div class="flex min-h-0 flex-col gap-3">
			{#if track?.album}
				<div class="text-body-sm text-onSurfaceVariant sm:pr-14">{track.album}</div>
			{/if}

			{#if loading}
				<div class="flex items-center gap-2 py-4 text-onSurfaceVariant">
					<div class="size-5 animate-pulse rounded-full border-2 border-primary border-t-transparent"></div>
					<span class="text-body-sm">Loading transcript...</span>
				</div>
			{:else if error}
				<div class="py-2 text-body-md text-error">{error}</div>
			{:else}
				<div
					bind:this={transcriptContentEl}
					class="max-h-[64dvh] overflow-y-auto whitespace-pre-wrap pr-1 select-text text-body-md text-onSurface sm:max-h-[70dvh] sm:pr-2 [&_mark]:rounded [&_mark]:bg-primary/20 [&_mark]:px-0.5"
					style="font-family: 'Noto Sans Devanagari', var(--font-sans)"
				>
					{@html transcriptHtml}
				</div>
			{/if}
		</div>
	{/snippet}
</CommonDialog>
