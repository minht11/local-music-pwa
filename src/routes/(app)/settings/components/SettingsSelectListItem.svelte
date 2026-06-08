<script lang="ts" module>
	import Select from '$lib/components/Select.svelte'
	import SettingsListItem, { type SettingsListItemProps } from './SettingsListItem.svelte'

	interface SettingsOptionsItem<V> {
		name: string
		value: V
	}

	interface Props<V, T extends SettingsOptionsItem<V>> extends Omit<
		SettingsListItemProps,
		'children'
	> {
		selected: T['value']
		items: T[]
	}
</script>

<script lang="ts" generics="const V, const T extends SettingsOptionsItem<V>">
	let { selected = $bindable(), items, ...props }: Props<V, T> = $props()
</script>

<SettingsListItem {...props}>
	<Select bind:selected {items} key="value" labelKey="name" class="w-40" />
</SettingsListItem>
