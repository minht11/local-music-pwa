<script lang="ts">
	import Switch from '$lib/components/Switch.svelte'
	import SettingsListItem, { type SettingsListItemProps } from './SettingsListItem.svelte'

	interface Props extends Omit<SettingsListItemProps, 'children'> {
		checked: boolean
		disabled?: boolean
	}

	let { checked = $bindable(), disabled, ...props }: Props = $props()
</script>

<SettingsListItem {...props}>
	<Switch bind:checked {disabled} />
</SettingsListItem>
