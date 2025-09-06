<script lang="ts" module>
	export interface SnackbarButton {
		label: string
		action: () => void
	}

	export interface SnackbarSnippet<SnippetArg = unknown> {
		type: 'snippet'
		arg?: SnippetArg
		snippet: Snippet<[SnippetArg]>
	}

	export interface SnackbarData<T = unknown> {
		id: string
		message: (() => string) | string
		duration?: number | false
		controls?: SnackbarButton | SnackbarSnippet<T> | false
		layout?: 'row' | 'column'
	}

	export interface SnackbarProps extends SnackbarData {
		ondismiss: (id: string) => void
	}
</script>

<script lang="ts">
	import Button from '../Button.svelte'

	const {
		id,
		message,
		layout = 'row',
		duration = 3000,
		controls: controlsFromProps,
		ondismiss,
	}: SnackbarProps = $props()

	const controls = $derived(
		controlsFromProps ?? {
			label: m.dismiss(),
			action: () => {},
		},
	)

	$effect(() => {
		if (!duration) {
			return
		}

		const timeoutId = window.setTimeout(ondismiss, duration, id)

		return () => {
			clearTimeout(timeoutId)
		}
	})
</script>

<div
	class={[
		'flex items-center rounded-lg bg-inverseSurface py-1.5 pr-1.5 pl-4 text-inverseOnSurface',
		layout === 'column' ? 'flex-col items-start' : 'gap-2',
	]}
>
	{#if message}
		<div class="min-h-3 py-2">
			{message}
		</div>
	{/if}

	{#if controls && 'type' in controls}
		{@render controls.snippet(controls.arg)}
	{:else if controls}
		<div class="ml-auto flex gap-2">
			{#if controls}
				<Button
					kind="flat"
					class="!text-inversePrimary"
					onclick={() => {
						ondismiss(id)
						controls.action()
					}}
				>
					{controls.label}
				</Button>
			{/if}
		</div>
	{/if}
</div>
