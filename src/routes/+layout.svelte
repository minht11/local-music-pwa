<script lang="ts">
	import { navigating, page } from '$app/stores'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import PlaylistDialogs from '$lib/components/app-dialogs/PlaylistDialogs.svelte'
	import MenuRenderer, { setupGlobalMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import SnackbarRenderer from '$lib/components/snackbar/SnackbarRenderer.svelte'
	import { provideMainStore } from '$lib/stores/main-store.svelte'
	import { providePlayer } from '$lib/stores/player/store.ts'
	import { setupAppViewTransitions } from '$lib/view-transitions.ts'
	import { setContext } from 'svelte'

	const mainStore = provideMainStore()
	const player = providePlayer()

	setupGlobalMenu()
	setupAppViewTransitions()

	const { children } = $props()

	const pageData = $derived($page.data)

	let bottom = $state<Snippet>()

	setContext('root-layout', {
		set bottom(val: Snippet | undefined) {
			bottom = val
		},
	})

	const updateStyles = async (color: number | undefined | null, isDark: boolean) => {
		const module = await import('$lib/theme.ts')

		if (color) {
			module.setThemeCssVariables(color, isDark)
		} else {
			module.clearThemeCssVariables()
		}
	}

	const updateWindowTileBarColor = () => {
		const element = document.querySelector('meta[name="theme-color"]')
		if (!element) {
			return
		}

		const surfaceRgb = window.getComputedStyle(document.body).getPropertyValue('--color-surface')
		element.setAttribute('content', `rgb(${surfaceRgb})`)
	}

	let initial = true
	$effect(() => {
		mainStore.themeColorSeed
		const isDark = mainStore.themeIsDark
		const color = mainStore.pickColorFromArtwork ? player.activeTrack?.primaryColor : undefined

		if (initial) {
			initial = false
			updateWindowTileBarColor()

			return
		}

		updateStyles(color ?? mainStore.themeColorSeed, isDark).then(() => {
			updateWindowTileBarColor()
		})
	})

	$effect.pre(() => {
		document.documentElement.classList.toggle('dark', mainStore.themeIsDark)
	})

	let overlayContentHeight = $state(0)

	$effect(() => {
		document.documentElement.style.setProperty(
			'--bottom-overlay-height',
			`${overlayContentHeight}px`,
		)
	})
</script>

<svelte:head>
	<title>{pageData.pageTitle || pageData.title}</title>
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === ' ') {
			e.preventDefault()

			player.togglePlay()
		}
	}}
/>

{#if $navigating}
	<div class="page-loading-indicator fixed z-20 top-0 inset-x-0 bg-tertiary/40 h-4px">
		<div
			class="page-loading-indicator-bar h-4px w-full origin-top-left overflow-hidden bg-onTertiaryContainer"
		></div>
	</div>
{/if}

{@render children()}

<div class="fixed flex flex-col bottom-0 overflow-hidden inset-x-0 pointer-events-none">
	<div class="flex flex-col">
		<SnackbarRenderer />

		{#if !$page.data.noPlayerOverlay}
			<div bind:clientHeight={overlayContentHeight} class="px-8px pb-8px pointer-events-none">
				<PlayerOverlay />
			</div>
		{/if}

		{#if bottom}
			{@render bottom()}
		{/if}
	</div>
</div>

<div class="fixed inset-0 z-10 pointer-events-none">
	<MenuRenderer />
</div>

<PlaylistDialogs />

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	.page-loading-indicator {
		animation: fade-in 0.2s 0.2s linear backwards;
	}

	.page-loading-indicator-bar {
		animation: page-loading-indicator 6s cubic-bezier(0.05, 0.7, 0.1, 1) forwards;
	}

	@keyframes page-loading-indicator {
		0% {
			transform: scaleX(0);
		}
		100% {
			transform: scaleX(0.8);
		}
	}

	@keyframes -global-view-regular-fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes -global-view-regular-fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes -global-view-regular-out {
		to {
			scale: var(--view-regular-out);
		}
	}

	@keyframes -global-view-regular-in {
		from {
			scale: var(--view-regular-in);
		}
	}

	:global(html[data-view-regular]) :global {
		--view-regular-out: 1.1;
		--view-regular-in: 0.9;

		&[data-view-back-navigation] {
			--view-regular-out: 0.9;
			--view-regular-in: 1.1;
		}

		&::view-transition-old(root) {
			animation:
				view-regular-fade-out 90ms theme('easing.outgoing40') forwards,
				view-regular-out 300ms theme('easing.incoming80outgoing40');
		}

		&::view-transition-new(root) {
			animation:
				view-regular-fade-in 210ms 90ms theme('easing.incoming80') backwards,
				view-regular-in 300ms theme('easing.incoming80outgoing40');
		}

		&::view-transition-old(pl-container) {
			display: none;
		}

		&::view-transition-new(pl-container) {
			animation: none;
		}
	}
</style>
