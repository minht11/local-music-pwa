<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import Icon, { type IconType } from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import heroImg from './assets/hero.avif'
	import secondaryImg from './assets/secondary.avif'

	interface Feature {
		icon: IconType
		title: string
		description: string
	}

	const features: Feature[] = [
		{
			icon: 'palette',
			title: 'Adaptive theming',
			description:
				'Beautiful interface that automatically adapts to your system theme and music artwork colors.',
		},
		{
			icon: 'flash',
			title: 'Lightning fast',
			description:
				'Instant startup, seamless playback, and responsive controls built for modern browsers.',
		},
		{
			icon: 'cellphone',
			title: 'Works everywhere',
			description:
				'Perfect experience across desktop, tablet, and mobile. No installation required.',
		},
		{
			icon: 'lock',
			title: 'Privacy-first design',
			description:
				'Your music stays on your device. Minimal privacy-preserving analytics, zero personal tracking, zero compromises on your privacy.',
		},
	]

	const benefits = [
		'Browse your music collection with smart filtering and search',
		'Create and manage custom playlists',
		'Control playback with keyboard shortcuts and media keys',
		'Full offline support - no internet connection needed',
	]
</script>

<Header title={m.appName()} noBackButton mode="fixed">
	<IconButton
		as="a"
		href="https://github.com/minht11/local-music-pwa"
		target="_blank"
		kind="flat"
		tooltip="View source code on GitHub"
	>
		<Icon type="github" />
	</IconButton>
	<Button as="a" href="/library/tracks" kind="outlined">Open app</Button>
</Header>

<section
	class="content-width-using-grid relative justify-items-center bg-gradient-to-br from-surfaceContainer to-surfaceContainerLow px-6 pt-24 pb-0 lg:pt-32 lg:pb-24"
>
	<div inert class="animated-gradient absolute -inset-x-32 -inset-y-16"></div>

	<div class="relative z-0 max-w-4xl text-center">
		<h1 class="mb-6 text-headline-md leading-tight font-bold text-onSurface lg:text-headline-lg">
			Your music, <span class="text-primary">your way</span>
		</h1>
		<p
			class="mx-auto mb-8 max-w-2xl text-title-md leading-relaxed text-onSurfaceVariant sm:text-title-lg"
		>
			Experience your local music collection with a beautiful, privacy-focused player that works
			entirely in your browser.
		</p>
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<Button as="a" href="/library/tracks" kind="filled" class="w-full sm:w-60">
				Launch Player
			</Button>
			<div class="text-body-md text-onSurfaceVariant">
				No signup • No installation • Fully offline
			</div>
		</div>
	</div>

	<img
		class="hero-image-slide-in relative mt-16 flex h-100 w-full max-w-4xl items-center justify-center rounded-2xl bg-surfaceContainerHighest object-cover object-left-bottom ring ring-outline/10 sm:h-120"
		src={heroImg}
		alt="App Screenshot"
		loading="eager"
		fetchpriority="high"
	/>
</section>

<section class="content-width py-20">
	<div class="mb-16 text-center">
		<h2 class="mb-4 text-headline-md font-bold text-onSurface sm:text-headline-md">
			Built for music lovers
		</h2>
		<p class="mx-auto max-w-xl text-title-md text-onSurfaceVariant">
			Every feature designed to enhance your listening experience while keeping your data private
			and secure.
		</p>
	</div>

	<div class="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
		{#each features as feature}
			<div
				class="card group p-8 transition-shadow duration-300 hover:bg-inverseSurface hover:shadow-lg"
			>
				<div
					class="mb-6 flex size-12 items-center justify-center rounded-full bg-tertiaryContainer"
				>
					<Icon type={feature.icon} class="text-primary" />
				</div>
				<h3
					class="mb-3 text-title-lg font-semibold text-onSurface group-hover:text-inverseOnSurface"
				>
					{feature.title}
				</h3>
				<p
					class="text-body-lg leading-relaxed text-onSurfaceVariant group-hover:text-inverseOnSurface"
				>
					{feature.description}
				</p>
			</div>
		{/each}
	</div>
</section>

<section class="bg-surfaceContainer py-20">
	<div class="content-width">
		<div class="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
			<div>
				<h2 class="mb-6 text-headline-md font-bold text-onSurface sm:text-headline-md">
					Everything you need for the perfect listening experience
				</h2>
				<ul class="space-y-4">
					{#each benefits as benefit}
						<li class="flex items-start gap-3">
							<Icon type="check" class="text-primary" />
							<span class="text-body-lg text-onSurfaceVariant">{benefit}</span>
						</li>
					{/each}
				</ul>
			</div>

			<img
				class="flex w-full items-center justify-center rounded-2xl bg-surfaceContainerHigh object-contain object-bottom ring ring-outline/10"
				src={secondaryImg}
				alt="Feature Illustration"
				loading="lazy"
			/>
		</div>
	</div>
</section>

<section class="content-width py-20">
	<div class="mx-auto max-w-xl text-center">
		<h2 class="mb-6 text-headline-md font-bold text-onSurface sm:text-headline-md">
			Ready to rediscover your music?
		</h2>
		<p class="mb-8 text-title-md text-onSurfaceVariant">
			Start enjoying your local music collection with complete privacy and control. No account
			needed, no data shared.
		</p>
		<Button as="a" href="/library/tracks" kind="filled">
			Open {m.appName()}
		</Button>
	</div>
</section>

<footer class="border-t border-outline/20 bg-surfaceContainerHigh">
	<div class="content-width py-8">
		<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="text-title-md font-medium text-onSurface">
				{m.appName()}
			</div>

			<div class="flex items-center gap-6 text-body-md">
				<a
					href="https://github.com/minht11/local-music-pwa"
					target="_blank"
					class="link flex items-center gap-2 text-onSurfaceVariant transition-colors duration-200 hover:text-onSurface"
				>
					<Icon type="github" class="h-5 w-5" />
					{m.aboutSourceCode()}
				</a>

				<a
					href="https://github.com/minht11/local-music-pwa#privacy"
					target="_blank"
					class="link text-onSurfaceVariant transition-colors duration-200 hover:text-onSurface"
				>
					{m.aboutPrivacy()}
				</a>
			</div>
		</div>

		<div class="mt-6 border-t border-outline/10 pt-6 text-center">
			<p class="text-body-sm text-onSurfaceVariant">
				Built with privacy in mind • Works fully offline • Open source
			</p>
		</div>
	</div>
</footer>

<style>
	.content-width {
		width: 100%;
		max-width: 1200px;
		padding-left: 24px;
		padding-right: 24px;
		margin-left: auto;
		margin-right: auto;
	}

	.content-width-using-grid {
		display: grid;
		grid-template-columns: minmax(0, var(--content-max-width));
		justify-content: center;
	}

	/* Ensure smooth transitions and better hover effects */
	.card {
		transition: all 0.3s ease;
	}

	.card:hover {
		transform: translateY(-2px);
	}

	/* Custom gradient background */
	.bg-gradient-to-br {
		background: linear-gradient(
			to bottom right,
			hsl(var(--md-sys-color-surface-container)),
			hsl(var(--md-sys-color-surface-container-low))
		);
	}

	.hero-image-slide-in {
		animation: hero-image-slide-in 0.5s ease-out forwards;
	}

	@keyframes hero-image-slide-in {
		0% {
			transform: translateY(40px);
			opacity: 0;
		}
		100% {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animated-gradient {
		background: radial-gradient(
			ellipse 1400px 800px at 0% 30%,
			hsl(from var(--color-tertiary) h s l / 0.1),
			hsl(from var(--color-tertiary) h s l / 0.1),
			hsl(from var(--color-tertiary) h s l / 0.04),
			transparent 60%
		);
		transform-origin: top;
		animation: glow-pulse 8s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0% {
			transform: scale(0.95, 1);
			opacity: 0.7;
		}
		50% {
			transform: scale(1.4, 1);
			opacity: 1;
		}
		100% {
			transform: scale(0.95, 1);
			opacity: 0.7;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-image-slide-in,
		.animated-gradient {
			animation: none;
		}
	}
</style>
