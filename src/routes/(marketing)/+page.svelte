<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'

	const features = [
		{
			icon: '🔒',
			title: 'Privacy-first design',
			description:
				'Your music stays on your device. Zero data collection, zero tracking, zero compromises on your privacy.',
		},
		{
			icon: '🎨',
			title: 'Adaptive theming',
			description:
				'Beautiful interface that automatically adapts to your system theme and music artwork colors.',
		},
		{
			icon: '⚡',
			title: 'Lightning fast',
			description:
				'Instant startup, seamless playback, and responsive controls built for modern browsers.',
		},
		{
			icon: '📱',
			title: 'Works everywhere',
			description:
				'Perfect experience across desktop, tablet, and mobile. No installation required.',
		},
	]

	const benefits = [
		'Browse your music collection with smart filtering and search',
		'Create and manage custom playlists',
		'Enjoy gapless playback and crossfade transitions',
		'Control playback with keyboard shortcuts and media keys',
		'Full offline support - no internet connection needed',
	]
</script>

<header class="w-full items-center border-b border-outline/20 bg-surfaceContainerHigh">
	<div class="content-width flex h-16 w-full items-center justify-between">
		<div class="text-title-lg font-medium text-onSurface">{m.appName()}</div>
		<div class="flex items-center gap-2">
			<IconButton
				as="a"
				href="https://github.com/minht11/local-music-pwa"
				target="_blank"
				kind="flat"
				ariaLabel="View source code on GitHub"
			>
				<Icon type="github" />
			</IconButton>
			<Button as="a" href="/library/tracks" kind="toned">Open app</Button>
		</div>
	</div>
</header>

<!-- Hero Section -->
<section
	class="content-width-using-grid justify-items-center bg-gradient-to-br from-surfaceContainer to-surfaceContainerLow px-6 py-24 lg:py-32"
>
	<div class="max-w-4xl text-center">
		<h1
			class="sm:text-7xl lg:text-8xl mb-6 text-headline-md leading-tight font-bold text-onSurface"
		>
			Your music, <span class="text-primary">your way</span>
		</h1>
		<p
			class="sm:text-2xl mx-auto mb-8 max-w-2xl text-title-lg leading-relaxed text-onSurfaceVariant"
		>
			Experience your local music collection with a beautiful, privacy-focused player that works
			entirely in your browser.
		</p>
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<Button as="a" href="/library/tracks" kind="filled" class="text-xl min-w-48 px-8 py-3">
				Launch Player
			</Button>
			<div class="text-base text-onSurfaceVariant">No signup • No installation • No tracking</div>
		</div>
	</div>

	<!-- Placeholder for hero illustration/screenshot -->
	<div
		class="mt-16 flex h-64 w-full max-w-4xl items-center justify-center rounded-2xl border border-outline/20 bg-surfaceContainerHighest sm:h-80 lg:h-96"
	>
		<div class="text-center text-onSurfaceVariant">
			<div class="text-6xl mb-4">🎵</div>
			<div class="text-lg font-medium">App Screenshot</div>
			<div class="text-sm opacity-70">Coming soon</div>
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
			<div class="card p-8 transition-shadow duration-300 hover:shadow-lg">
				<div class="text-5xl mb-4">{feature.icon}</div>
				<h3 class="mb-3 text-title-lg font-semibold text-onSurface">
					{feature.title}
				</h3>
				<p class="text-body-lg leading-relaxed text-onSurfaceVariant">
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
							<span class="text-2xl mt-1 text-primary">✓</span>
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
					<div class="text-5xl mb-3">🎧</div>
					<div class="text-lg font-medium">Feature Illustration</div>
					<div class="text-sm opacity-70">Coming soon</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="content-width py-20">
	<div class="mx-auto max-w-3xl text-center">
		<h2 class="mb-6 text-headline-md font-bold text-onSurface sm:text-headline-md">
			Ready to rediscover your music?
		</h2>
		<p class="mb-8 text-title-md text-onSurfaceVariant">
			Start enjoying your local music collection with complete privacy and control. No account
			needed, no data shared.
		</p>
		<Button as="a" href="/library/tracks" kind="filled" class="text-xl min-w-48 px-8 py-3">
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
				Built with privacy in mind • No data collection • Works offline
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
</style>
