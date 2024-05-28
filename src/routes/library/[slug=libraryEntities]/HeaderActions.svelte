<script lang="ts">
	import { ripple } from '$lib/actions/ripple.ts'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { PageData } from './$types.ts'

	interface Props {
		data: PageData
	}

	const { data }: Props = $props()

	const { store } = data

	const menu = useMenu()

	const sortMenuHandler = (e: MouseEvent) => {
		const menuItems = store.sortOptions.map((option) => ({
			label: option.name,
			selected: store.sortByKey === option.key,
			action: () => {
				store.sortByKey = option.key
			},
		}))

		menu.showFromEvent(e, menuItems, {
			anchor: true,
			preferredAlignment: {
				vertical: 'top',
				horizontal: 'right',
			},
		})
	}
</script>

{#snippet sortActions()}
	<button
		use:ripple
		class="flex interactable w-96px rounded-8px h-40px pl-12px pr-4px gap-4px items-center text-label-md"
		onclick={sortMenuHandler}
	>
		{store.sortBy?.name}

		<Icon type="menuDown" class="h-16px w-16px ml-auto" />
	</button>

	<IconButton
		class={clx(store.order === 'desc' && 'rotate-180', 'transition-transform')}
		icon="sortAscending"
		ariaLabel="Toggle sort order"
		onclick={() => {
			store.order = store.order === 'asc' ? 'desc' : 'asc'
		}}
	/>
{/snippet}

<div class="mx-auto w-full max-w-540px mb-24px -mt-24px">
	<div
		class="flex items-center w-max ml-auto bg-surfaceContainerHigh rounded-t-8px rounded-b-16px pt-24px"
	>
		{@render sortActions()}
	</div>
</div>
