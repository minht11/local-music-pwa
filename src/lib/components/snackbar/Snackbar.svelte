<script lang="ts" context="module">
	export interface SnackbarData {
		id: string
		message: (() => string) | string
		duration?: number | false
		controls?: 'spinner' | false
	}

	export interface SnackbarProps extends SnackbarData {
		ondismiss: (id: string) => void
	}
</script>

<script lang="ts">
	const { id, message, duration = 8000, ondismiss } = $props<SnackbarProps>()

	const dismiss = () => ondismiss(id)

	$effect(() => {
		if (!duration) {
			return
		}

		const timeoutId = window.setTimeout(dismiss, duration)

		return () => {
			clearTimeout(timeoutId)
		}
	})
</script>

<div
	class="bg-inverseSurface text-inverseOnSurface rounded-8px gap-8px flex items-center pr-6px pl-16px py-6px"
>
	<div class="min-h-12px py-8px">
		{message}
	</div>
</div>
