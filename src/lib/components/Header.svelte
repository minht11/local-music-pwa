<script lang="ts" context="module">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { wait } from '$lib/helpers/utils'
	import IconButton from './IconButton.svelte'

	export interface HeaderProps {
		children?: Snippet
		title?: string
		noBackButton?: boolean
	}
</script>

<script lang="ts">
	const { children, title, noBackButton }: HeaderProps = $props()

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
</script>

<div bind:this={scrollThresholdEl} class="h-0 w-full" inert></div>
<header
	class={clx(
		'sticky inset-x-0 top-0 z-10 flex h-[--app-header-height] flex-shrink-0',
		isScrolled && 'bg-surfaceContainerHigh bg-surface',
	)}
>
	<div class="max-w-1280px flex mx-auto w-full items-center pl-24px pr-8px">
		{#if !noBackButton}
			<IconButton
				icon="backArrow"
				class="view-transition-page-back-btn mr-8px"
				onclick={handleBackClick}
			/>
		{/if}

		{#if title}
			<h1 class="view-transition-page-title text-title-lg mr-auto">{title}</h1>
		{/if}

		<div class="flex items-center gap-8px">
			{@render children?.()}
		</div>
	</div>
</header>
