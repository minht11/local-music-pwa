<script lang="ts" module>
	export interface HeaderProps {
		children?: Snippet
		title?: string
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
	class={clx(
		'inset-x-0 top-0 z-10 flex h-[var(--app-header-height)] flex-shrink-0 transition-background-color duration-200 ease-in-out',
		isScrolled && 'bg-surfaceContainerHigh',
		isFixed ? 'fixed' : 'sticky',
	)}
>
	<div class="max-w-1280px flex mx-auto w-full items-center pl-24px pr-8px">
		{#if !noBackButton}
			<BackButton class="mr-8px" />
		{/if}

		{#if title}
			<h1 class="text-title-lg mr-auto">{title}</h1>
		{/if}

		<div class="flex items-center gap-8px">
			{@render children?.()}
		</div>
	</div>
</header>
