<script lang="ts" module>
	import type { Snippet } from 'svelte'

	export interface HeaderProps {
		children?: Snippet
		title?: ClassNameValue
		noBackButton?: boolean
		mode?: 'fixed' | 'sticky'
	}
</script>

<script lang="ts">
	import BackButton from './BackButton.svelte'

	const { children, title, noBackButton, mode = 'sticky' }: HeaderProps = $props()

	const isFixed = $derived(mode === 'fixed')

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
</script>

<div bind:this={scrollThresholdEl} class="h-0 w-full" inert></div>

{#if isFixed}
	<div class="h-[var(--app-header-height)] shrink-0" aria-hidden="true"></div>
{/if}

<header
	class={[
		'ease-in-out inset-x-0 top-0 z-10 flex h-[var(--app-header-height)] shrink-0 transition-[background-color] duration-200',
		isScrolled && 'bg-surfaceContainerHigh',
		isFixed ? 'fixed' : 'sticky',
	]}
>
	<div class="mx-auto flex w-full max-w-320 items-center pr-2 pl-6">
		{#if !noBackButton}
			<BackButton class="mr-2" />
		{/if}

		{#if title}
			<h1 class="mr-auto text-title-lg">{title}</h1>
		{/if}

		<div class="flex items-center gap-2">
			{@render children?.()}
		</div>
	</div>
</header>
