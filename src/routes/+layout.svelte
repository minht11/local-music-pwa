<script lang="ts">
	import { page } from '$app/stores'
	import { goto, onNavigate } from '$app/navigation'
	import type { LayoutData } from './$types'
	import IconButton from '$lib/components/IconButton.svelte'
	import { wait } from '$lib/helpers/utils'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import { setContext, type Snippet } from 'svelte'
	import invariant from 'tiny-invariant'
	import { providePlayer } from '$lib/stores/player.svelte'
	import { pendingRipples } from '$lib/actions/ripple'

	const { data, children } = $props<{
		data: LayoutData
		children: Snippet
	}>()

	const pageData = $derived($page.data)

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

	onNavigate((navigation) => {
		if (!document.startViewTransition) {
			return
		}

		return new Promise(async (resolve) => {
			await Promise.race([
				pendingRipples(),
				wait(100),
			])

			document.startViewTransition(async () => {
				resolve()
				await navigation.complete
			})
		})
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

	setContext('root-layout', {
		set actions(val: Snippet | undefined) {
			actions = val
		},
	})

	providePlayer()
</script>

<svelte:head>
	<title>{pageData.pageTitle || pageData.title}</title>
</svelte:head>

{#key data.pathname}
	<div class="flex h-full w-full flex-col">
		<header
			class="will-change-bg relative flex h-56px flex-shrink-0 xs:h-56px sm:h-64px {isScrolled
				? 'tonal-elevation-4 bg-surface'
				: ''}"
		>
			<div class="max-w-1280px mx-auto w-full items-center px-16px flex">
				{#if !$page.data.hideBackButton}
					<IconButton icon="backArrow" class="mr-8px" onclick={handleBackClick} />
				{/if}

				<h1 class="text-title-lg mr-auto">{pageData.title}</h1>

				<div class="flex items-center gap-4px">
					{#if actions}
						{@render actions()}
					{/if}
				</div>
			</div>
		</header>
		<div class="flex flex-grow flex-col overflow-auto bg-background">
			<div bind:this={scrollThresholdEl} class="h-0 w-full" inert />
			<div class={clx(
				'mx-auto w-full max-w-[1280px] flex-grow px-8px pt-16px',
				$page.data.hidePlayerOverlay ? 'pb-16px' : 'pb-120px scroll-pb-120px'
			)}>
				{@render children()}
			</div>
		</div>
	</div>
{/key}

{#if !$page.data.hidePlayerOverlay}
	<PlayerOverlay />
{/if}

<style>
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
