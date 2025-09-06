<script lang="ts">
	import type { Snippet } from 'svelte'
	import { logger } from '$lib/helpers/logger.ts'
	
	interface Props {
		children: Snippet
		fallback?: Snippet<[Error]>
	}
	
	const { children, fallback }: Props = $props()
	
	let hasError = $state(false)
	let error = $state<Error | null>(null)
	
	// Global error handler for unhandled promise rejections
	if (typeof window !== 'undefined') {
		window.addEventListener('unhandledrejection', (event) => {
			logger.error('Unhandled promise rejection', event.reason)
			hasError = true
			error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
			event.preventDefault()
		})
		
		window.addEventListener('error', (event) => {
			logger.error('Global error', event.error || new Error(event.message))
			hasError = true
			error = event.error || new Error(event.message)
		})
	}
	
	const reset = () => {
		hasError = false
		error = null
	}
	
	const defaultFallback: Snippet<[Error]> = (error: Error) => {
		return `
			<div class="flex min-h-screen items-center justify-center bg-surface text-onSurface">
				<div class="card max-w-md p-6 text-center">
					<div class="mb-4 text-6xl">😵</div>
					<h1 class="mb-2 text-title-lg">Something went wrong</h1>
					<p class="mb-4 text-body-md text-onSurfaceVariant">
						An unexpected error occurred. Please try refreshing the page.
					</p>
					<details class="mb-4 text-left">
						<summary class="cursor-pointer text-body-sm text-onSurfaceVariant hover:text-onSurface">
							Error details
						</summary>
						<pre class="mt-2 whitespace-pre-wrap text-xs text-error">${error.message}\n\n${error.stack}</pre>
					</details>
					<div class="flex gap-2 justify-center">
						<button onclick="${reset}" class="rounded bg-primary px-4 py-2 text-onPrimary hover:bg-primary/90">
							Try Again
						</button>
						<button onclick="() => window.location.reload()" class="rounded bg-secondary px-4 py-2 text-onSecondary hover:bg-secondary/90">
							Refresh Page
						</button>
					</div>
				</div>
			</div>
		`
	}
</script>

{#if hasError && error}
	{@render (fallback || defaultFallback)(error)}
{:else}
	{@render children()}
{/if}