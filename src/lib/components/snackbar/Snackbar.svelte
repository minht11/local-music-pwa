<script lang="ts" module>
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
	const { id, message, duration = 3000, ondismiss }: SnackbarProps = $props()

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
	class="flex items-center gap-2 rounded-lg bg-inverseSurface py-1.5 pr-1.5 pl-4 text-inverseOnSurface"
>
	<div class="min-h-3 py-2">
		{message}
	</div>
</div>
