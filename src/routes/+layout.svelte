<script lang="ts">
	import { page } from '$app/stores'
	import { goto, onNavigate } from '$app/navigation'
	import type { LayoutData } from './$types'
	import IconButton from '$lib/components/IconButton.svelte'
	import Slot from '$lib/components/slot/Slot.svelte'
	import SlotProvider from '$lib/components/slot/SlotProvider.svelte'
	import { wait } from '$lib/helpers/utils'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'

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

	export let data: LayoutData

	$: pageData = $page.data

	let scrollThresholdEl: HTMLDivElement
	let isScrolled = false

	const io = new IntersectionObserver(
		([entry]) => {
			isScrolled = !entry?.isIntersecting
		},
		{ threshold: 0 },
	)

	$: {
		io.disconnect()
		if (scrollThresholdEl) {
			io.observe(scrollThresholdEl)
		}
	}

	onNavigate((navigation) => {
		if (!document.startViewTransition) {
			return
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve()
				await navigation.complete
			})
		})
	})
</script>

<svelte:head>
	<title>{pageData.pageTitle || pageData.title}</title>
</svelte:head>

{#key data.pathname}
	<SlotProvider>
		<div class="contain-strict flex h-full flex-col">
			<header
				class="will-change-bg relative flex h-48 flex-shrink-0 items-center px-16 xs:h-56 sm:h-64 {isScrolled
					? 'tonal-elevation-4 bg-surface'
					: ''}"
			>
				{#if !$page.data.hideBackButton}
					<IconButton icon="backArrow" class="mr-8" on:click={handleBackClick} />
				{/if}

				<h1 class="text-title-lg mr-auto">{pageData.title}</h1>

				<div class="flex items-center gap-4">
					<Slot name="actions" />
				</div>
			</header>
			<div class="flex flex-grow flex-col overflow-auto">
				<div bind:this={scrollThresholdEl} class="h-0 w-full" inert />
				<div class="mx-auto w-full max-w-[1280px] flex-grow px-8 py-16">
					<slot />
				</div>
			</div>
		</div>
	</SlotProvider>
{/key}

{#if !$page.data.hidePlayerOverlay}
	<PlayerOverlay />
{/if}

<style>
	:root::view-transition-old(root),
	:root::view-transition-new(root) {
		animation-duration: 200ms;
	}
</style>
