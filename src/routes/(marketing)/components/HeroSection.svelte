<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import heroImg from '../assets/hero.avif?as=metadata'
</script>

{#snippet floatingCard(className: string, label: string, title: string)}
	<div class={`hero-floating-card ${className} lg:absolute lg:max-w-60`}>
		<div class="text-label-sm text-onSurfaceVariant">{label}</div>
		<div class="mt-1.5 text-title-sm font-semibold text-onSurface">{title}</div>
	</div>
{/snippet}

<section
	class="hero-scroll-timeline mktg-content-width relative mx-auto grid w-full max-w-6xl items-center justify-items-center gap-10 overflow-hidden px-6 pt-20 pb-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:pt-24 lg:pb-24"
>
	<div class="relative text-center lg:text-left">
		<h1 class="hero-title mb-6 font-bold text-onSurface">
			Your local music player,
			<span class="inline-block text-primary">in the browser.</span>
		</h1>
		<p
			class="mx-auto mb-7 max-w-2xl text-title-md leading-relaxed text-onSurfaceVariant sm:text-title-lg lg:mx-0 lg:max-w-xl"
		>
			A clean player for your local music, with playlists, queue, sound controls, and offline
			listening.
		</p>
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
			<Button as="a" href="/library/tracks" kind="filled" class="w-full sm:w-60">
				Open Player
			</Button>
			<Button as="a" href="#how-it-works" kind="outlined" class="w-full sm:w-60">
				How It Works
			</Button>
		</div>
		<div class="mt-4 text-body-md text-onSurfaceVariant">Free • No sign-up • Open source</div>
	</div>

	<div class="relative grid gap-4 py-5">
		<div class="hero-image-shell">
			<img
				class="hero-image block aspect-7/5 h-auto w-full rounded-3xl bg-surfaceContainerHighest object-cover object-bottom-left"
				src={heroImg.src}
				width={heroImg.width}
				height={heroImg.height}
				alt="Snae Player showing the music library and playback controls"
				loading="eager"
				fetchpriority="high"
			/>
		</div>
		{@render floatingCard(
			'hero-floating-card-top',
			'Private by default',
			'Your files stay on your device',
		)}
		{@render floatingCard(
			'hero-floating-card-bottom',
			'Built-in controls',
			'Equalizer, favorites, playlists, queue, and playback speed.',
		)}
	</div>
</section>

<style>
	@reference '../../app.css';

	.hero-scroll-timeline {
		view-timeline-name: --marketing-hero;
		view-timeline-axis: block;
	}

	.hero-title {
		font-size: clamp(3rem, 8.8vw, 5.25rem);
		line-height: 0.92;
		letter-spacing: -0.05em;
		text-wrap: balance;
	}

	.hero-image-shell {
		position: relative;
		overflow: hidden;
		border-radius: 2rem;
		padding: 0.7rem;
		background:
			linear-gradient(
				160deg,
				--alpha(var(--color-surfaceContainerHighest) / 0.95),
				--alpha(var(--color-surfaceContainerHigh) / 0.92)
			),
			radial-gradient(circle at top left, --alpha(var(--color-primary) / 0.14), transparent 60%);
		box-shadow:
			0 22px 50px --alpha(var(--color-shadow) / 0.18),
			inset 0 0 0 1px --alpha(var(--color-outline) / 0.14);
	}

	.hero-image {
		box-shadow: 0 16px 36px --alpha(var(--color-shadow) / 0.12);
	}

	.hero-floating-card {
		border: 1px solid --alpha(var(--color-outline) / 0.22);
		border-radius: 1.35rem;
		background: --alpha(var(--color-surfaceContainerHighest) / 0.88);
		padding: 0.8rem 0.95rem;
		box-shadow: 0 14px 28px --alpha(var(--color-shadow) / 0.12);
		backdrop-filter: blur(10px);
	}

	@media (width >= --theme(--breakpoint-lg)) {
		.hero-floating-card-top {
			top: 0.9rem;
			left: -1rem;
		}

		.hero-floating-card-bottom {
			right: 0.75rem;
			bottom: -0.75rem;
		}
	}
</style>
