<script lang="ts">
	import { page } from '$app/state'
	import { APP_DESCRIPTION_EN, APP_NAME_EN } from '$lib/app-metadata.ts'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import heroImg from './assets/hero.avif?as=metadata'
	import FeaturesSection from './components/FeaturesSection.svelte'
	import GettingStartedSection from './components/GettingStartedSection.svelte'
	import HeroSection from './components/HeroSection.svelte'
	import HowItWorksSection from './components/HowItWorksSection.svelte'
	import SoundControlsSection from './components/SoundControlsSection.svelte'

	const seoTitle = `${APP_NAME_EN} - Private offline local music player in your browser`
	const seoDescription = APP_DESCRIPTION_EN
</script>

<svelte:head>
	<title>{seoTitle}</title>
	<meta name="description" content={seoDescription} />
	<meta
		name="keywords"
		content="local music player, offline music player, browser music player, play music from device, private music player, offline web app, equalizer, playback speed control"
	/>
	<meta name="robots" content="index,follow,max-image-preview:large" />
	<meta name="application-name" content={APP_NAME_EN} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={seoDescription} />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content={`${page.url.origin}${heroImg.src}`} />
	<meta property="og:image:alt" content="Snae Player showing the library and player interface" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seoTitle} />
	<meta name="twitter:description" content={seoDescription} />
	<meta name="twitter:image" content={`${page.url.origin}${heroImg.src}`} />

	<link rel="canonical" href={`${page.url.origin}${page.url.pathname}`} />
	<script type="application/ld+json">
		{JSON.stringify([
			{
				'@context': 'https://schema.org',
				'@type': 'WebApplication',
				name: APP_NAME_EN,
				applicationCategory: 'MultimediaApplication',
				applicationSubCategory: 'Music Player',
				operatingSystem: 'Any',
				browserRequirements: 'Requires a modern web browser',
				description: seoDescription,
				url: page.url.href,
				image: `${page.url.origin}${heroImg.src}`,
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD',
				},
				sameAs: ['https://github.com/minht11/local-music-pwa'],
				featureList: [
					'Play music stored on your device',
					'Works offline with no account or uploads',
					'Organizes your library with playlists, queue, and favorites',
					'Includes equalizer and playback speed controls',
				],
			},
		])}]
	</script>
</svelte:head>

<header class="mktg-content-width flex-row justify-start gap-2 py-4">
	<div
		class="mr-auto flex items-center gap-2 text-title-sm font-medium text-onSurface xs:text-title-md"
	>
		<img src="/icons/responsive.svg" width="24" height="24" alt="" class="size-6" />
		{m.appName()}
	</div>

	<IconButton
		as="a"
		href="https://github.com/minht11/local-music-pwa"
		target="_blank"
		kind="flat"
		tooltip="View source code on GitHub"
	>
		<Icon type="github" />
	</IconButton>

	<Button as="a" href="/library/tracks" kind="outlined" class="max-sm:hidden">Open Player</Button>
</header>

<!-- <div class="floating-cta">
	<Button as="a" href="/library/tracks" kind="filled">Open Player</Button>
</div> -->

<main class="flex flex-col gap-14 select-text md:gap-32">
	<HeroSection />

	<HowItWorksSection />

	<FeaturesSection />

	<SoundControlsSection />

	<GettingStartedSection />
</main>

<footer class="w-full border-t border-outlineVariant bg-shadow/7">
	<div class="mktg-content-width items-center justify-between gap-4 py-8 sm:flex-row">
		<div class="flex items-center gap-2 text-label-lg font-medium text-onSurfaceVariant">
			<img
				src="/icons/responsive.svg"
				width="24"
				height="24"
				alt="Logo"
				class="size-5 opacity-60"
			/>
			{m.appName()}
		</div>

		<div class="flex items-center gap-6 text-body-md">
			<a
				href="https://github.com/minht11/local-music-pwa"
				rel="noopener noreferrer"
				target="_blank"
				class="flex items-center gap-1.5 text-onSurfaceVariant transition-colors duration-200 hover:text-onSurface"
			>
				<Icon type="github" class="h-4 w-4" />
				{m.aboutSourceCode()}
			</a>

			<a
				href="https://github.com/minht11/local-music-pwa#privacy"
				rel="noopener noreferrer"
				target="_blank"
				class="text-onSurfaceVariant transition-colors duration-200 hover:text-onSurface"
			>
				{m.aboutPrivacy()}
			</a>
		</div>
	</div>
</footer>

<style>
	.floating-cta {
		position: fixed;
		top: 1rem;
		right: 1.5rem;
		z-index: 50;
		pointer-events: auto;
		visibility: visible;
		opacity: 0;
		transform: translateY(-0.5rem);
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
	}

	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view(block)) {
			.floating-cta {
				visibility: hidden;
				animation: floating-cta-enter both;
				animation-timeline: --marketing-hero;
				animation-range: exit 12% exit 48%;
				transition: none;
			}
		}
	}

	@keyframes floating-cta-enter {
		from {
			visibility: hidden;
			opacity: 0;
			transform: translateY(-0.75rem) scale(0.96);
		}

		to {
			visibility: visible;
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
