<script lang="ts">
	import { goto, onNavigate } from '$app/navigation'
	import { navigating, page } from '$app/stores'
	import { pendingRipples } from '$lib/actions/ripple'
	import IconButton from '$lib/components/IconButton.svelte'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import MenuRenderer, { initGlobalMenu } from '$lib/components/menu/MenuRenderer.svelte'
	import SnackbarRenderer from '$lib/components/snackbar/SnackbarRenderer.svelte'
	import { wait } from '$lib/helpers/utils'
	import { provideMainStore } from '$lib/stores/main-store.svelte'
	import { providePlayer } from '$lib/stores/player/store.ts'
	import { setContext } from 'svelte'

	const { children } = $props()

	const pageData = $derived($page.data)

	initGlobalMenu()
	const mainStore = provideMainStore()

	let scrollThresholdEl = $state<HTMLDivElement>()
	let isScrolled = $state(false)

	const io = new IntersectionObserver(
		([entry]) => {
			isScrolled = !entry?.isIntersecting
		},
		{ threshold: 0 },
	)

	$effect(() => {
		if (scrollThresholdEl) {
			io.observe(scrollThresholdEl)
		}

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
		$page.url.pathname

		return () => {
			actions = undefined
			bottom = undefined
		}
	})

	const player = providePlayer()

	const updateStyles = async (color: number | undefined, isDark: boolean) => {
		const module = await import('$lib/theme.ts')

		if (color) {
			module.setThemeCssVariables(color, isDark)
		} else {
			module.clearThemeCssVariables()
		}
	}

	let initial = true
	$effect(() => {
		const isDark = mainStore.themeIsDark
		const color = mainStore.pickColorFromArtwork ? player.activeTrack?.primaryColor : undefined

		if (initial) {
			initial = false
			return
		}

		void updateStyles(color, isDark)
	})

	$effect.pre(() => {
		document.documentElement.classList.toggle('dark', mainStore.themeIsDark)
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
		></div>
	</div>
{/if}

{#if !pageData.noHeader}
	<header
		class={clx(
			'fixed inset-x-0 top-0 z-10 flex h-[var(--app-header-height)] flex-shrink-0',
			isScrolled && 'bg-surfaceContainerHigh bg-surface',
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

			<div class="flex items-center gap-8px">
				{#if actions}
					{@render actions()}
				{/if}
			</div>
		</div>
	</header>
	<div bind:this={scrollThresholdEl} class="h-0 w-full" inert></div>
{/if}

{#key pageData.rootLayoutKey?.() ?? $page.url.pathname}
	{@render children()}
{/key}

<div
	class="fixed flex flex-col bottom-0 overflow-hidden inset-x-0 pointer-events-none [&>*]:pointer-events-auto"
>
	<div bind:clientHeight={overlayContentHeight} class="flex flex-col">
		<div class="max-w-500px px-8px w-full mx-auto mb-16px flex flex-col gap-8px">
			<SnackbarRenderer />
		</div>

		{#if !$page.data.noPlayerOverlay}
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
</style>
