<script lang="ts">
	import { navigating, page } from '$app/stores'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import PlaylistDialogs from '$lib/components/app-dialogs/PlaylistDialogs.svelte'
	import MenuRenderer, { setupGlobalMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import SnackbarRenderer from '$lib/components/snackbar/SnackbarRenderer.svelte'
	import { setupBottomBar } from '$lib/layout-bottom-bar.svelte'
	import { provideMainStore } from '$lib/stores/main-store.svelte'
	import { providePlayer } from '$lib/stores/player/store.ts'
	import { setupAppViewTransitions } from '$lib/view-transitions.ts'

	const mainStore = provideMainStore()
	const player = providePlayer()

	setupGlobalMenu()
	setupAppViewTransitions(() => mainStore.isReducedMotion)
	const bottomBar = setupBottomBar()

	const { children } = $props()

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
		element.setAttribute('content', surfaceRgb)
	}

	let initial = true
	$effect(() => {
		mainStore.themeColorSeed
		const isDark = mainStore.isThemeDark
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
		document.documentElement.classList.toggle('dark', mainStore.isThemeDark)
	})

	let overlayContentHeight = $state(0)

	$effect(() => {
		document.documentElement.style.setProperty(
			'--bottom-overlay-height',
			`${overlayContentHeight}px`,
		)
	})
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === ' ') {
			e.preventDefault()

			player.togglePlay()
		}
	}}
/>

{#if $navigating}
	<div class="page-loading-indicator fixed inset-x-0 top-0 z-20 h-1 bg-tertiary/40">
		<div
			class="page-loading-indicator-bar h-1 w-full origin-top-left overflow-hidden bg-onTertiaryContainer"
		></div>
	</div>
{/if}

{@render children()}

<div class="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col overflow-hidden">
	<div class="flex flex-col">
		<SnackbarRenderer />

		{#if !$page.data.noPlayerOverlay}
			<div bind:clientHeight={overlayContentHeight} class="pointer-events-none px-4 pb-2">
				<PlayerOverlay />
			</div>
		{/if}

		{#if bottomBar.snippet}
			{@render bottomBar.snippet()}
		{/if}
	</div>
</div>

<div class="pointer-events-none fixed inset-0 z-10">
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
				view-regular-fade-out 90ms var(--ease-outgoing40) forwards,
				view-regular-out 300ms var(--ease-incoming80outgoing40);
		}

		&::view-transition-new(root) {
			animation:
				view-regular-fade-in 210ms 90ms var(--ease-incoming80) backwards,
				view-regular-in 300ms var(--ease-incoming80outgoing40);
		}

		&::view-transition-old(pl-container) {
			display: none;
		}

		&::view-transition-new(pl-container) {
			animation: none;
		}
	}
</style>
