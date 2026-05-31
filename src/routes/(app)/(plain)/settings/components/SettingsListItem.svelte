<script lang="ts" module>
	// biome-ignore lint/correctness/noUnusedImports: false positive
	import { tooltip as attachTooltip } from '$lib/attachments/tooltip.ts'
	import Icon from '$lib/components/icon/Icon.svelte'

	export interface SettingsListItemProps {
		title: string
		description?: string
		tooltip?: string
		children?: Snippet
		afterTitle?: Snippet
		bottomDivider?: boolean
		columnInCompactLayout?: boolean
	}
</script>

<script lang="ts">
	const {
		title,
		description,
		tooltip,
		children,
		afterTitle,
		bottomDivider,
		columnInCompactLayout,
	}: SettingsListItemProps = $props()
</script>

<div
	class={[
		'flex justify-between gap-x-2 gap-y-4 p-4',
		columnInCompactLayout ? 'flex-col sm:flex-row sm:items-center' : 'flex-row items-center',
		bottomDivider && 'border-b border-outlineVariant last:border-b-0',
	]}
>
	<div class="mr-auto flex flex-col justify-center gap-1">
		<div class="flex items-center gap-2">
			<div>{title}</div>

			{#if tooltip}
				<button
					type="button"
					class="interactable inline-flex size-6 items-center justify-center rounded-full text-onSurfaceVariant"
					{@attach attachTooltip(tooltip)}
				>
					<Icon type="information" class="size-4" />
				</button>
			{/if}

			{@render afterTitle?.()}
		</div>
		{#if description}
			<div class="max-w-160 text-body-sm text-onSurfaceVariant">
				{description}
			</div>
		{/if}
	</div>

	{@render children?.()}
</div>
