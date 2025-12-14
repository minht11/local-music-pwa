<script lang="ts">
	import { browser } from '$app/environment'
	import { navigating, page } from '$app/state'
	import { APP_DIALOGS_COMPONENTS } from '$lib/components/app-dialogs/dialogs.ts'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import MenuRenderer, { setupGlobalMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import SnackbarRenderer from '$lib/components/snackbar/SnackbarRenderer.svelte'
	import { setupOverlaySnippets } from '$lib/layout-bottom-bar.svelte'
	import { MainStore } from '$lib/stores/main/store.svelte.ts'
	import { setMainStoreContext } from '$lib/stores/main/use-store.ts'
	import { PlayerStore } from '$lib/stores/player/player.svelte.ts'
	import { setPlayerStoreContext } from '$lib/stores/player/use-store.ts'
	import { onViewTransitionPrepare, setupAppViewTransitions } from '$lib/view-transitions.svelte.ts'
	import { setupAppInstallPromptListeners } from './layout/app-install-prompt.ts'
	import {
		type DirectoriesPermissionPromptSnackbarArg,
		setupDirectoriesPermissionPrompt,
	} from './layout/setup-directories-permission-prompt.svelte.ts'
	import { setupTheme } from './layout/setup-theme.svelte.ts'

	// These context are in different files from their implementation
	// to allow better trees shaking and inlining
	const mainStore = setMainStoreContext(new MainStore())
	const player = setPlayerStoreContext(new PlayerStore())

	let pageContainer = $state<HTMLElement | null>(null)

	setupTheme()
	setupGlobalMenu()
	setupAppViewTransitions(
		() => pageContainer,
		() => mainStore.isReducedMotion,
	)
	setupAppInstallPromptListeners()
	const overlaySnippets = setupOverlaySnippets()

	const { children } = $props()

	let overlayContentHeight = $state(0)

	$effect(() => {
		document.documentElement.style.setProperty(
			'--bottom-overlay-height',
			`${overlayContentHeight}px`,
		)
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

	if (browser) {
		void setupDirectoriesPermissionPrompt(directoriesPermissionSnackbar)
	}
</script>

{#snippet directoriesPermissionSnackbar({ dirs, dismiss }: DirectoriesPermissionPromptSnackbarArg)}
	<div class="flex w-full flex-col gap-1 pt-2 pb-1">
		<div>
			<div>{m.libraryDirPromptBrowserPermission()}</div>
			<div class="text-body-sm opacity-54">
				{m.libraryDirPromptExplanation()}
			</div>
		</div>

		<!-- Showing only subset at the time so snackbar does not take up the whole screen -->
		{#each dirs().slice(0, 3) as dir}
			<div class="flex items-center justify-between gap-2">
				<Icon type="folder" class="size-4 text-tertiaryContainer" />

				<div class="truncate">
					{dir.name}
				</div>

				<Button kind="flat" class="ml-auto w-24 shrink-0 text-inversePrimary!" onclick={dir.action}>
					{m.libraryDirPromptGrant()}
				</Button>
			</div>
		{/each}

		<Button kind="flat" class="text-inversePrimary!" onclick={dismiss}>
			{m.dismiss()}
		</Button>
	</div>
{/snippet}

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
		<!-- TODO. Will be used for multi select -->
		<!-- <div class="px-4 pb-4 sm:pb-2">
			<div class="mx-auto w-full max-w-225">
				{#each overlaySnippets.abovePlayer as snippet}
					{@render snippet()}
				{/each}
			</div>
		</div> -->

		{#if !page.data.noPlayerOverlay}
			<div class="px-4 pb-4 sm:pb-2">
				<PlayerOverlay />
			</div>
		{/if}

		{@render overlaySnippets.bottomBar?.()}
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
