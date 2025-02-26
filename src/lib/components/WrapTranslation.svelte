<script lang="ts" generics="Params extends Record<string, unknown>">
	type Props = {
		[K in keyof Params]: Snippet
	} & {
		messageFn: (value: Params) => string
	}

	const { messageFn, ...props }: Props = $props()

	const partMarker = '__PART_MARKER__'
	const valueMarker = '__VALUE_MARKER__'

	const parts = $derived.by(() => {
		const paramsKeys = Object.keys(props)

		const placeholdersEntries = paramsKeys.map(
			(key) => [key, `${partMarker}${valueMarker}${key}${partMarker}`] as const,
		)

		const placeholderParams = Object.fromEntries(placeholdersEntries) as Params
		const message = messageFn(placeholderParams)

		return message.split(partMarker)
	})
</script>

<div>
	{#each parts as part}
		{#if part.startsWith(valueMarker)}
			{@render props[part.replaceAll(valueMarker, '')]?.()}
		{:else}
			{part}
		{/if}
	{/each}
</div>
