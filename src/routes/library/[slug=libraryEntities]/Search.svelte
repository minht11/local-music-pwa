<script lang="ts">
	import { goto } from '$app/navigation'
	import IconButton from '$lib/components/IconButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { PageData } from './$types.ts'

	interface Props {
		store: PageData['store']
	}

	const { store }: Props = $props()

	const searchHandler = debounce((e: InputEvent) => {
		const term = (e.target as HTMLInputElement).value

		store.searchTerm = term
	}, 300)

	const menu = useMenu()

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

<div
	class="sticky @container top-8px mt-8px mb-16px z-1 bg-surfaceContainerHighest flex w-full rounded-8px px-8px gap-8px items-center ml-auto max-w-500px"
>
	<input
		value={store.searchTerm}
		type="text"
		placeholder="Search tracks"
		class="h-48px w-240px pl-8px grow placeholder:text-onSurface/54 text-body-md bg-transparent focus:outline-none"
		oninput={(e) => searchHandler(e as unknown as InputEvent)}
	/>

	<Separator vertical class="h-24px my-auto" />

	<IconButton icon="sort" tooltip="Open sort menu" onclick={sortMenuHandler} />

	<IconButton
		class={clx(store.order === 'desc' && 'rotate-180', 'transition-transform')}
		icon="sortAscending"
		tooltip="Toggle sort order"
		onclick={() => {
			store.order = store.order === 'asc' ? 'desc' : 'asc'
		}}
	/>

	<Separator vertical class="h-24px my-auto" />

	<IconButton
		ariaLabel="Application menu"
		tooltip="Open application menu"
		icon="moreVertical"
		onclick={generalMenuHandler}
	/>
</div>
