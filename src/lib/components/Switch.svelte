<script lang="ts">
	interface Props {
		checked: boolean
	}

	let { checked = $bindable(false) }: Props = $props()

	const toggle = () => {
		checked = !checked
	}
</script>

<div
	class={clx(
		'w-52px h-32px border-2 cursor-pointer flex items-center rounded-32px transition-all duration-150',
		checked ? 'border-transparent bg-primary' : 'border-outline bg-surface bg-surfaceContainerHigh',
	)}
	tabindex="0"
	role="switch"
	aria-checked={checked}
	onclick={toggle}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			toggle()
		}
	}}
>
	<input type="checkbox" bind:checked class="hidden" />
	<div
		class={clx(
			'h-16px w-16px rounded-full ml-6px transition-all duration-150',
			checked ? 'bg-onPrimary translate-x-20px scale-150' : 'bg-outline',
		)}
	/>
</div>
