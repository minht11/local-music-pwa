<script lang="ts">
	import Icon, { type IconType } from '$lib/components/icon/Icon.svelte'
	import Section from './Section.svelte'

	interface Feature {
		icon: IconType
		title: string
		description: string
	}

	const features: Feature[] = [
		{
			icon: 'folder',
			title: 'Play music from your device',
			description:
				'Open a music folder or pick tracks, then keep listening across phones, tablets, laptops, and desktops.',
		},
		{
			icon: 'album',
			title: 'Tracks, albums, and artists sorted for you',
			description:
				'Your library is organized from file metadata, so it is easy to browse by track, album, or artist.',
		},
		{
			icon: 'playlistMusic',
			title: 'Queue, favorites, and listening history',
			description:
				'Save favorites, revisit what you played, and stay in control of what comes next with queue, shuffle, and repeat close at hand.',
		},
		{
			icon: 'palette',
			title: 'Colors that follow your music',
			description:
				"The interface picks up colors from your album artwork and adapts to your system's light or dark theme.",
		},
	]
</script>

<Section
	id="features"
	class="mktg-content-width"
	label="What's inside"
	title="Built around real listening"
	maxWidth="max-w-xl"
>
	<div class="grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
		{#each features as feature}
			<article class="feature-card marketing-scroll-enter-soft p-7">
				<div class="feature-card-icon mb-5">
					<Icon type={feature.icon} />
				</div>
				<h3 class="mb-2 text-title-lg font-semibold text-onSurface">
					{feature.title}
				</h3>
				<p class="text-body-lg leading-relaxed text-onSurfaceVariant">
					{feature.description}
				</p>
				<span class="feature-card-deco"><Icon type={feature.icon} /></span>
			</article>
		{/each}
	</div>
</Section>

<style>
	.feature-card {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border-radius: 1.75rem;
		border: 1px solid --alpha(var(--color-outline) / 0.2);
		background: linear-gradient(
			155deg,
			--alpha(var(--color-surfaceContainerHighest) / 0.97),
			--alpha(var(--color-surfaceContainerHigh) / 0.9)
		);
		box-shadow: 0 4px 16px --alpha(var(--color-shadow) / 0.06);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.feature-card:hover {
		border-color: --alpha(var(--color-primary) / 0.4);
		box-shadow: 0 8px 28px --alpha(var(--color-shadow) / 0.1);
	}

	.feature-card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 1rem;
		background: --alpha(var(--color-primaryContainer) / 0.55);
		color: var(--color-primary);
	}

	.feature-card-deco {
		position: absolute;
		bottom: -0.75rem;
		right: -0.5rem;
		width: 6.5rem;
		height: 6.5rem;
		color: var(--color-primary);
		opacity: 0.06;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.feature-card-deco :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
