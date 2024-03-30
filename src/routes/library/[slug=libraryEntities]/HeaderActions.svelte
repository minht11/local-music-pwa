<script lang="ts">
	import { goto } from '$app/navigation'
	import { ripple } from '$lib/actions/ripple'
	import IconButton from '$lib/components/IconButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { debounce } from '$lib/helpers/utils'
	import type { PageData } from './$types'

	interface Props {
		data: PageData
	}

	const { data }: Props = $props()

	const { store } = data

	const searchHandler = debounce((e: InputEvent) => {
		const term = (e.target as HTMLInputElement).value

		store.searchTerm = term
	}, 300)

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

	const generalMenuHandler = (e: MouseEvent) => {
		const menuItems = [
			{
				label: 'Settings',
				action: () => {
					goto('/settings')
				},
			},
			{
				label: 'About',
				action: () => {
					goto('/about')
				},
			},
		]

		menu.showFromEvent(e, menuItems, {
			width: 200,
			anchor: true,
			preferredAlignment: {
				vertical: 'top',
				horizontal: 'right',
			},
		})
	}
</script>

<input
	value={store.searchTerm}
	type="text"
	placeholder="Search tracks"
	class="h-40px w-240px pl-8px placeholder:text-onSurface/54 text-body-md bg-transparent focus:outline-none"
	oninput={(e) => searchHandler(e as unknown as InputEvent)}
/>

<Separator vertical class="h-24px my-auto" />

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

<Separator vertical class="h-24px my-auto" />

<IconButton ariaLabel="Application menu" icon="moreVertical" onclick={generalMenuHandler} />
