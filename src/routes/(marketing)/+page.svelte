<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import Icon, { type IconType } from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'

	const features: Array<{ icon: IconType; title: string; description: string }> = [
		{
			icon: 'lock',
			title: 'Privacy-first design',
			description:
				'Your music stays on your device. Minimal analytics for page views only, zero personal tracking, zero compromises on your privacy.',
		},
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
	<Button as="a" href="/library/tracks" kind="toned">Open app</Button>
</Header>

<!-- Hero Section -->
<section
	class="hero-section content-width-using-grid relative justify-items-center bg-gradient-to-br from-surfaceContainer to-surfaceContainerLow px-6 py-24 lg:py-32"
>
	<!-- Animated gradient overlay -->
	<div class="animated-gradient absolute -inset-x-32 -inset-y-16 opacity-25"></div>

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
			<Button as="a" href="/library/tracks" kind="filled">Launch Player</Button>
			<div class="text-body-md text-onSurfaceVariant">
				No signup • No installation • Privacy preserving analytics
			</div>
		</div>
	</div>

	<!-- Placeholder for hero illustration/screenshot -->
	<div
		class="relative z-0 mt-16 flex h-64 w-full max-w-4xl items-center justify-center rounded-2xl border border-outline/20 bg-surfaceContainerHighest sm:h-80 lg:h-96"
	>
		<div class="text-center text-onSurfaceVariant">
			<Icon type="musicNote" class="mb-4 text-headline-lg text-onSurfaceVariant" />
			<div class="text-title-md font-medium">App Screenshot</div>
			<div class="text-body-sm opacity-70">Coming soon</div>
		</div>
	</div>
</section>

<!-- Features Grid -->
<section class="content-width py-20">
	<div class="mb-16 text-center">
		<h2 class="mb-4 text-headline-md font-bold text-onSurface sm:text-headline-md">
			Built for music lovers
		</h2>
		<p class="mx-auto max-w-2xl text-title-md text-onSurfaceVariant">
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

<!-- Benefits Section -->
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

			<!-- Placeholder for feature illustration -->
			<div
				class="flex h-80 items-center justify-center rounded-2xl border border-outline/20 bg-surfaceContainerHigh"
			>
				<div class="text-center text-onSurfaceVariant">
					<Icon type="headphones" class="mb-3 text-headline-lg text-onSurfaceVariant" />
					<div class="text-title-md font-medium">Feature Illustration</div>
					<div class="text-body-sm opacity-70">Coming soon</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
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

<!-- Footer -->
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
				Built with privacy in mind • Works fully offline
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

	/* Animated gradient overlay */
	.hero-section {
		position: relative;
	}

	.animated-gradient {
		background: radial-gradient(
			ellipse 1400px 700px at 0% 30%,
			hsl(from var(--color-tertiary) h s l / 0.1),
			hsl(from var(--color-tertiary) h s l / 0.09),
			hsl(from var(--color-tertiary) h s l / 0.04),
			transparent 60%
		);
		transform-origin: top;
		animation: glow-pulse 8s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0% {
			transform: scale(0.95);
			opacity: 0.7;
		}
		50% {
			transform: scale(1.05);
			opacity: 1;
		}
		100% {
			transform: scale(2);
			opacity: 0.7;
		}
	}

	/* Reduce motion for users who prefer it */
	@media (prefers-reduced-motion: reduce) {
		.animated-gradient {
			animation: none;
			transform: scale(1);
			opacity: 0.5;
		}
	}
</style>
