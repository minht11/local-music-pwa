<script lang="ts">
	import { nanoid } from 'nanoid'

	interface TextFieldProps {
		label?: string
		value: string
		type?: 'text'
		placeholder?: string
		class?: string
	}

	let {
		label,
		value = $bindable(''),
		type = 'text',
		placeholder,
		class: className,
	}: TextFieldProps = $props()

	const id = nanoid(6)
</script>

<div
	class="h-56px flex flex-col rounded-4px border text-onSurface border-outline p-1px focus-within:p-0 focus-within:border-2px focus-within:border-primary"
>
	<!-- <label for={id} class="block">
		{label}
	</label> -->
	<input
		{id}
		{type}
		class="w-full placeholder:text-onSurfaceVariant appearance-none grow border-none outline-none bg-transparent px-14px"
		bind:value
		{placeholder}
	/>
</div>
