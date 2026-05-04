<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import heroImg from '../assets/hero.avif?as=metadata'
</script>

<section
	class="mktg-content-width relative mx-auto grid w-full items-center justify-items-center gap-10 overflow-hidden px-6 pt-20 pb-0 sm:px-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:pt-24 lg:pb-24"
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
		<div
			class="mx-auto grid max-w-120 grid-cols-1 items-center justify-center gap-4 sm:grid-cols-2 lg:mx-0 lg:justify-start"
		>
			<Button as="a" href="/library/tracks" kind="filled" class="w-full">Open Player</Button>
			<Button as="a" href="#how-it-works" kind="outlined" class="w-full">How It Works</Button>
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
		<div class="hero-floating-card hero-floating-card-top lg:absolute lg:max-w-60">
			<div class="text-label-sm text-onSurfaceVariant">Private by default</div>
			<div class="mt-1.5 text-title-sm font-semibold text-onSurface">
				Your files stay on your device
			</div>
		</div>
	</div>
</section>

<style>
	@reference '../../app.css';

	.hero-title {
		font-size: clamp(3rem, 6.6vw, 6.25rem);
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
	}
</style>
