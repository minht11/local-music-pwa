<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Section from './Section.svelte'

	interface Step {
		title: string
		description: string
	}

	const steps: Step[] = [
		{
			title: 'Add a directory',
			description:
				'In Settings, click Add directory and choose the music folder you want Snae Player to scan.',
		},
		{
			title: 'Check your library',
			description:
				'Tracks, albums, and artists are organized automatically from your file metadata.',
		},
		{
			title: 'Press play',
			description: 'Browse your collection, queue what is next, and start listening.',
		},
	]
</script>

<div class="bg-shadow/7 py-20">
	<Section class="mktg-content-width" label="Getting started" title="Up and running in seconds">
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

		<div class="marketing-scroll-enter-soft mt-10 flex justify-center">
			<Button as="a" href="/library/tracks" kind="filled" class="w-full sm:w-60">
				Open Player
			</Button>
		</div>
	</Section>
</div>
