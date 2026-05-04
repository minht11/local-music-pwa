<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Section from './Section.svelte'

	interface Props {
		onOpenPlayerClick: (event: MouseEvent) => void
	}

	interface Step {
		title: string
		description: string
	}

	const { onOpenPlayerClick }: Props = $props()

	const steps: Step[] = [
		{
			title: 'Add a directory',
			description:
				'In Settings, click Add directory and choose the music folder you want Snae Player to scan.',
		},
		{
			title: 'Browse your library',
			description:
				'Tracks, albums, and artists are organized automatically from your file metadata.',
		},
		{
			title: 'Set up what plays next',
			description: 'Build a playlist, queue a few tracks, mark favorites, and press play.',
		},
	]
</script>

<div class="bg-shadow/7 py-14 md:py-20">
	<Section
		class="mktg-content-width"
		label="Getting started"
		title="Start listening in three steps"
	>
		<div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
			{#each steps as step, i}
				<div
					class="marketing-scroll-enter-soft flex flex-col rounded-3xl border border-outlineVariant p-7"
				>
					<div
						class="flex size-8 items-center justify-center rounded-full bg-primaryContainer/60 text-body-lg text-primary"
					>
						{i + 1}
					</div>

					<h3 class="mt-4 mb-2 text-title-lg font-semibold text-onSurface">{step.title}</h3>

					<p class="text-body-lg leading-relaxed text-onSurfaceVariant">{step.description}</p>
				</div>
			{/each}
		</div>

		<p class="marketing-scroll-enter-soft mt-4 text-center text-body-md text-onSurfaceVariant">
			Works in modern browsers on Android and iOS, plus Chromebooks, Windows PCs, and Macs.
		</p>

		<Button
			as="a"
			href="/library/tracks"
			kind="filled"
			class="marketing-scroll-enter-soft mt-10 w-full sm:w-60"
			onclick={onOpenPlayerClick}
		>
			Open Player
		</Button>
	</Section>
</div>
