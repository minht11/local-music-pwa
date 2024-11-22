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
		'h-32px flex w-13 shrink-0 cursor-pointer items-center rounded-4xl border-2 transition-all duration-150',
		checked ? 'border-transparent bg-primary' : 'border-outline bg-surfaceContainerHigh',
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
			'ml-1.5 h-4 w-4 rounded-full transition-all duration-150',
			checked ? 'translate-x-5 scale-150 bg-onPrimary' : 'bg-outline',
		)}
	></div>
</div>
