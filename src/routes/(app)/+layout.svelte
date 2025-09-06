<script lang="ts">
	import { setContext } from 'svelte'
	import { navigating, page, updated } from '$app/state'
	import { APP_DIALOGS_COMPONENTS } from '$lib/components/app-dialogs/dialogs.ts'
	import MenuRenderer, { setupGlobalMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import SnackbarRenderer from '$lib/components/snackbar/SnackbarRenderer.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { setupBottomBar } from '$lib/layout-bottom-bar.svelte'
	import { MainStore } from '$lib/stores/main/store.svelte.ts'
	import { MAIN_STORE_CONTEXT } from '$lib/stores/main/use-store.ts'
	import { YTMPlayerStore } from '$lib/stores/player/ytm-player.svelte.ts'
	import { PLAYER_STORE_CONTEXT } from '$lib/stores/player/use-store.ts'
	import { onViewTransitionPrepare, setupAppViewTransitions } from '$lib/view-transitions.svelte.ts'
	import { setupAppInstallPromptListeners } from './layout/app-install-prompt.ts'
	import { setupTheme } from './layout/setup-theme.svelte.ts'

	// These context keys are in different files from their implementation
	// to allow better trees shaking and inlining
	const mainStore = new MainStore()
	setContext(MAIN_STORE_CONTEXT, mainStore)

	const player = new YTMPlayerStore()
	setContext(PLAYER_STORE_CONTEXT, player)

	let pageContainer = $state<HTMLElement | null>(null)

	setupTheme()
	setupGlobalMenu()
	setupAppViewTransitions(
		() => pageContainer,
		() => mainStore.isReducedMotion,
	)
	setupAppInstallPromptListeners()
	const bottomBar = setupBottomBar()

	const { children } = $props()

	let overlayContentHeight = $state(0)

	$effect(() => {
		document.documentElement.style.setProperty(
			'--bottom-overlay-height',
			`${overlayContentHeight}px`,
		)
	})

	$effect(() => {
		if (updated.current) {
			snackbar({
				id: 'app-update',
				message: m.appUpdateAvailable(),
				duration: false,
				controls: {
					label: m.reload(),
					action: () => {
						window.location.reload()
					},
				},
			})
		}
	})

	onViewTransitionPrepare((_state, match) => {
		if (match.view === 'player') {
			const setProperties = (targetSelector: string, prefix: string) => {
				const target = document.querySelector(targetSelector)
				const rect = target?.getBoundingClientRect()

				if (!rect) {
					return
				}

				if (prefix === 'fp') {
					document.documentElement.style.setProperty('--fp-scroll-top', `${window.scrollY}px`)
				}

				const setProperty = (name: keyof DOMRect) => {
					document.documentElement.style.setProperty(`--${prefix}-${name}`, `${rect[name]}px`)
				}

				setProperty('left')
				setProperty('bottom')
				setProperty('width')
				setProperty('height')
			}

			setProperties('#mini-player', 'mp')
			setProperties('#full-player', 'fp')
		}
	})
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
			e.preventDefault()

			player.togglePlay()
		}
	}}
/>

{#if navigating?.to}
	<div class="page-loading-indicator fixed inset-x-0 top-0 z-20 h-1 bg-tertiary/40">
		<div
			class="page-loading-indicator-bar h-1 w-full origin-top-left overflow-hidden bg-onTertiaryContainer"
		></div>
	</div>
{/if}

<div bind:this={pageContainer} class="flex grow flex-col">
	{@render children()}
</div>

<div class="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col gap-2 overflow-hidden">
	<SnackbarRenderer />

	<div bind:clientHeight={overlayContentHeight} class="flex flex-col">
		{#if !page.data.noPlayerOverlay}
			<div class="px-4 pb-4 sm:pb-2">
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

{#each APP_DIALOGS_COMPONENTS as Dialog}
	<Dialog />
{/each}

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

	@keyframes -global-view-bottom-bar-out {
		to {
			translate: 0 100%;
		}
	}

	@keyframes -global-view-bottom-bar-in {
		from {
			translate: 0 100%;
		}
	}

	:global(html:active-view-transition-type(regular)) {
		--view-regular-out: 1.1;
		--view-regular-in: 0.9;

		&:active-view-transition-type(backwards) {
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

		&::view-transition-old(pl-card) {
			display: none;
		}

		&::view-transition-new(pl-card) {
			animation: none;
		}

		&::view-transition-new(bottom-bar):only-child {
			animation: view-bottom-bar-in 300ms var(--ease-standard) forwards;
		}

		&::view-transition-old(bottom-bar):only-child {
			animation: view-bottom-bar-out 300ms var(--ease-standard) forwards;
		}
	}
</style>
