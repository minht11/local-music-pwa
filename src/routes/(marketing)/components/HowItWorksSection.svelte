<script lang="ts">
	import Icon, { type IconType } from '$lib/components/icon/Icon.svelte'
	import Section from './Section.svelte'

	interface DetailCard {
		icon: IconType
		title: string
		description: string
	}

	const detailCards: DetailCard[] = [
		{
			icon: 'folder',
			title: 'You choose the folder',
			description:
				"Click Add directory, then pick the music folder you want to use from the browser's built-in folder picker.",
		},
		{
			icon: 'lockCheck',
			title: 'Browser permission comes first',
			description:
				'That permission applies only to the folder you selected, not the rest of your files, and you can revoke it later in site settings.',
		},
		{
			icon: 'cached',
			title: 'Library data stays on this device',
			description:
				'Track details, playlists, and app data are saved on this device so the player can reopen quickly and keep working offline.',
		},
	]
</script>

<Section
	id="how-it-works"
	class="mktg-content-width"
	label="How it works"
	title="Private by design, simple to start"
	description="Pick a folder, approve access in the browser, and Snae Player reads only the music you choose."
>
	<div
		class="how-it-works-slider grid w-full snap-x snap-mandatory auto-cols-[minmax(18rem,22rem)] grid-flow-col gap-6 overflow-x-auto overscroll-x-contain pb-2 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible lg:pb-0"
	>
		{#each detailCards as card}
			<article class="marketing-scroll-enter-soft how-it-works-card snap-start p-7">
				<div
					class="mb-5 flex size-13 items-center justify-center rounded-2xl bg-secondaryContainer/55 text-secondary"
				>
					<Icon type={card.icon} />
				</div>

				<h3 class="mb-2 text-title-lg font-semibold text-onSurface">{card.title}</h3>
				<p class="text-body-lg leading-relaxed text-onSurfaceVariant">{card.description}</p>
			</article>
		{/each}
	</div>
</Section>

<style>
	@reference '../../../app.css';

	.how-it-works-slider {
		width: 100vw;
		margin-inline: calc(50% - 50vw);
		padding-inline: --spacing(6);
		scroll-padding-inline: --spacing(6);
	}

	@media (width >= --theme(--breakpoint-lg)) {
		.how-it-works-slider {
			width: 100%;
			margin-inline: auto;
			padding-inline: 0;
			scroll-padding-inline: 0;
		}
	}

	.how-it-works-card {
		border: 1px solid --alpha(var(--color-outline) / 0.2);
		border-radius: 1.75rem;
		background: linear-gradient(
			155deg,
			--alpha(var(--color-surfaceContainerHighest) / 0.97),
			--alpha(var(--color-surfaceContainerHigh) / 0.9)
		);
		box-shadow: 0 4px 16px --alpha(var(--color-shadow) / 0.06);
	}
</style>
