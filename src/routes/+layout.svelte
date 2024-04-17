<script lang="ts">
	import { goto, onNavigate } from '$app/navigation'
	import { navigating, page } from '$app/stores'
	import { pendingRipples } from '$lib/actions/ripple'
	import IconButton from '$lib/components/IconButton.svelte'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import MenuRenderer, { initGlobalMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import SnackbarRenderer from '$lib/components/snackbar/SnackbarRenderer.svelte'
	import { wait } from '$lib/helpers/utils'
	import { providePlayer } from '$lib/stores/player/store.ts'
	import { clearThemeCssVariables, setThemeCssVariables } from '$lib/theme'
	import { setContext } from 'svelte'
	import invariant from 'tiny-invariant'
	import type { LayoutData } from './$types'

	interface Props {
		data: LayoutData
		children: Snippet
	}

	const { data, children }: Props = $props()

	const pageData = $derived($page.data)

	initGlobalMenu()

	let scrollThresholdEl = $state<HTMLDivElement>()
	let isScrolled = $state(false)

	const io = new IntersectionObserver(
		([entry]) => {
			isScrolled = !entry?.isIntersecting
		},
		{ threshold: 0 },
	)

	$effect(() => {
		invariant(scrollThresholdEl, 'scrollThresholdEl is undefined')

		io.observe(scrollThresholdEl)

		return () => {
			io.disconnect()
		}
	})

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) {
			return
		}

		const { promise, resolve } = Promise.withResolvers<void>()

		await Promise.race([pendingRipples(), wait(100)])

		document.documentElement.setAttribute('data-view-from', navigation.from?.route.id ?? '')
		document.documentElement.setAttribute('data-view-to', navigation.to?.route.id ?? '')

		document.startViewTransition(async () => {
			resolve()
			await navigation.complete
		})

		return promise
	})

	const handleBackClick = () => {
		if (window.navigation !== undefined) {
			if (window.navigation.canGoBack) {
				window.navigation.back()
			} else {
				goto('/')
			}

			return
		}

		const path = $page.url.pathname
		window.history.back()
		// If there are no entries inside history back button
		// won't work and user will be stuck.
		// Example: user loads new tab going straight to /settings,
		// when app back button is pressed, nothing happens because
		// this is the first entry in history.
		// To prevent this check if URL changed, after short delay,
		// if it didn't back button most likely didn't do anything.
		wait(50).then(() => {
			if (path === $page.url.pathname) {
				goto('/')
			}
		})
	}

	let actions = $state<Snippet>()
	let bottom = $state<Snippet>()

	setContext('root-layout', {
		set actions(val: Snippet | undefined) {
			actions = val
		},
		set bottom(val: Snippet | undefined) {
			bottom = val
		},
	})

	$effect.pre(() => {
		data.pathname

		return () => {
			actions = undefined
			bottom = undefined
		}
	})

	const player = providePlayer()

	let initial = true
	const primaryThemeColor = $derived(player.activeTrack?.primaryColor)
	$effect(() => {
		const color = primaryThemeColor

		if (initial) {
			initial = false
			return
		}

		// TODO. Import this lazy
		if (color) {
			setThemeCssVariables(color, true)
		} else {
			clearThemeCssVariables()
		}
	})

	let overlayContentHeight = $state(0)

	$effect(() => {
		const bottomPadding = 16

		document.documentElement.style.setProperty(
			'--bottom-overlay-height',
			`${overlayContentHeight + bottomPadding}px`,
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
		/>
	</div>
{/if}

<header
	class={clx(
		'fixed inset-x-0 top-0 z-10 flex h-[--app-header-height] flex-shrink-0',
		isScrolled && !pageData.disableHeaderElevation && 'tonal-elevation-4 bg-surface',
	)}
>
	<div class="max-w-1280px flex mx-auto w-full items-center pl-24px pr-8px">
		{#if !$page.data.hideBackButton}
			<IconButton
				icon="backArrow"
				class="view-transition-page-back-btn mr-8px"
				onclick={handleBackClick}
			/>
		{/if}

		<h1 class="view-transition-page-title text-title-lg mr-auto">{pageData.title}</h1>

		<!-- <input
			type="text"
			placeholder="Search your library"
			class="rounded-24px h-40px w-240px px-24px ml-auto placeholder:text-onSurface/54 text-body-md bg-onSecondaryContainer/12 focus:outline-none"
		/> -->

		<!-- <IconButton as="a" href="/search" icon="search" /> -->

		<div class="flex items-center gap-8px tonal-elevation-2 bg-surface rounded-8px px-8px py-4px">
			{#if actions}
				{@render actions()}
			{/if}
		</div>
	</div>
</header>

<div bind:this={scrollThresholdEl} class="h-0 w-full" inert />

{#key data.pathname}
	<div
		class={clx(
			// mt-[--app-header-height]
			'flex flex-col mx-auto w-full max-w-1280px grow',
			$page.data.hidePlayerOverlay ? '' : 'pb-[--bottom-overlay-height]',
			!$page.data.disableContentPadding && 'px-8px pt-16px',
		)}
	>
		{@render children()}
	</div>
{/key}

<div
	class="fixed flex flex-col bottom-0 overflow-hidden inset-x-0 pointer-events-none [&>*]:pointer-events-auto"
>
	<div bind:clientHeight={overlayContentHeight} class="flex flex-col">
		<div class="max-w-500px px-8px w-full mx-auto mb-16px flex flex-col gap-8px">
			<SnackbarRenderer />
		</div>

		{#if !$page.data.hidePlayerOverlay}
			<div class="px-8px pb-8px w-full">
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

	/* :global(.interactable) {
		position: relative;
		overflow: hidden;
		-moz-appearance: none;
		-webkit-appearance: none;
		appearance: none;
		border: none;
		outline: none;
		text-decoration: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		z-index: 0;
	}

	:global(.interactable::after) {
		display: none;
		content: '';
		position: absolute;
		height: 100%;
		width: 100%;
		left: 0;
		top: 0;
		background: currentColor;
		z-index: -1;
		pointer-events: none;
	}

	@media (any-hover: hover) {
		:global(.interactable:hover::after) {
			display: block;
			opacity: 0.08;
		}

		:global(.interactable[disabled]::after) {
			display: none;
		}
	}

	:global(.interactable:is(:focus-visible)),
	:global(.interactable:hover:focus-visible) {
		outline: 2px solid theme('colors.onSurface');
		outline-offset: -2px;
	}

	:global(.interactable:focus-visible::after) {
		display: block;
		opacity: 0.12;
	} */

	/* @keyframes page-enter-scale {
		from {
			transform: scale(0.8, 0.8);
		}
	}

	@keyframes page-exit-scale {
		to {
			transform: scale(0.8, 0.8);
		}
	}

	@keyframes fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	:root::view-transition-image-pair(root) {
		isolation: auto;
	}

	:root::view-transition-old(root),
	:root::view-transition-new(root) {
		mix-blend-mode: normal;
	}

	:root::view-transition-old(root) {
		animation: fade-out 90ms cubic-bezier(0.4, 0, 1, 1) forwards;
	}

	:root::view-transition-new(root) {
		animation:
			fade-in 210ms 90ms cubic-bezier(0, 0, 0.2, 1) backwards,
			page-enter-scale 300ms cubic-bezier(0.4, 0, 0.2, 1);
	} */
</style>
