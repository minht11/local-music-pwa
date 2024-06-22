<script lang="ts">
	import { onNavigate } from '$app/navigation'
	import { navigating, page } from '$app/stores'
	import { getActiveRipplesCount } from '$lib/actions/ripple'
	import PlayerOverlay from '$lib/components/PlayerOverlay.svelte'
	import NewPlaylistDialog from '$lib/components/dialogs/new-playlist/NewPlaylistDialog.svelte'
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

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) {
			return
		}

		const { promise, resolve } = Promise.withResolvers<void>()

		if (getActiveRipplesCount() > 0) {
			// Allow ripple animations to finish before transitioning
			await wait(175)
		}

		document.documentElement.setAttribute('data-view-from', navigation.from?.route.id ?? '')
		document.documentElement.setAttribute('data-view-to', navigation.to?.route.id ?? '')

		document.startViewTransition(async () => {
			resolve()
			await navigation.complete
		})

		return promise
	})

	let bottom = $state<Snippet>()

	setContext('root-layout', {
		set bottom(val: Snippet | undefined) {
			bottom = val
		},
	})

	$effect.pre(() => {
		$page.url.pathname

		return () => {
			bottom = undefined
		}
	})

	const player = providePlayer()

	const updateStyles = async (color: number | undefined | null, isDark: boolean) => {
		const module = await import('$lib/theme.ts')

		if (color) {
			module.setThemeCssVariables(color, isDark)
		} else {
			module.clearThemeCssVariables()
		}
	}

	let initial = true
	$effect(() => {
		mainStore.themeColorSeed
		const isDark = mainStore.themeIsDark
		const color = mainStore.pickColorFromArtwork ? player.activeTrack?.primaryColor : undefined

		console.log('updateStyles', color, isDark)
		if (initial) {
			initial = false
			return
		}

		void updateStyles(color ?? mainStore.themeColorSeed, isDark)
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

{#key pageData.rootLayoutKey?.() ?? $page.url.pathname}
	{@render children()}
{/key}

<div
	class="fixed flex flex-col bottom-0 overflow-hidden inset-x-0 pointer-events-none [&>*]:pointer-events-auto"
>
	<div class="flex flex-col">
		<div class="max-w-500px px-8px w-full mx-auto mb-16px flex flex-col gap-8px">
			<SnackbarRenderer />
		</div>

		{#if !$page.data.noPlayerOverlay}
			<div bind:clientHeight={overlayContentHeight} class="px-8px pb-8px w-full">
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

<NewPlaylistDialog />

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
