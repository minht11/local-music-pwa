<script lang="ts">
	interface Props {
		children?: Snippet
		id?: string
		class?: ClassValue
		label: string
		labelColor?: 'primary' | 'secondary' | 'tertiary'
		title: string
		description?: string
		maxWidth?: string
	}

	const {
		children,
		id,
		// TODO.
		class: className = 'mktg-content-width',
		label,
		labelColor = 'primary',
		title,
		description,
		maxWidth = 'max-w-3xl',
	}: Props = $props()

	const labelColorClass = $derived(
		labelColor === 'tertiary'
			? 'text-tertiary'
			: labelColor === 'secondary'
				? 'text-secondary'
				: 'text-primary',
	)
</script>

<section {id} class={[className]}>
	<div class={['marketing-scroll-enter mx-auto mb-12 text-center', maxWidth]}>
		<div class={['mb-3 text-label-lg font-medium tracking-wide', labelColorClass]}>{label}</div>
		<h2 class="text-headline-md font-bold text-onSurface">{title}</h2>
		{#if description}
			<p class="mt-2 text-title-md text-onSurfaceVariant">{description}</p>
		{/if}
	</div>

	{@render children?.()}
</section>

<style>
	:global(.marketing-scroll-enter),
	:global(.marketing-scroll-enter-soft) {
		will-change: opacity, transform;
	}

	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view(block)) {
			:global(.marketing-scroll-enter) {
				animation: marketing-section-enter both;
				animation-timeline: view(block);
				animation-range: entry 8% cover 34%;
			}

			:global(.marketing-scroll-enter-soft) {
				animation: marketing-card-enter both;
				animation-timeline: view(block);
				animation-range: entry 6% cover 26%;
			}
		}
	}

	@keyframes marketing-section-enter {
		from {
			opacity: 0;
			transform: translateY(1.5rem) scale(0.985);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes marketing-card-enter {
		from {
			opacity: 0;
			transform: translateY(1rem) scale(0.985);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
