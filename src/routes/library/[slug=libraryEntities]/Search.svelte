<script lang="ts">
	import { goto } from '$app/navigation'
	import IconButton from '$lib/components/IconButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { PageData } from './$types.ts'

	interface Props {
		name: string
		store: PageData['store']
	}

	const { name, store }: Props = $props()

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
	class="@container sticky top-2 z-1 mt-2 mb-4 ml-auto flex w-full max-w-125 items-center gap-2 rounded-lg border border-primary/10 bg-surfaceContainerHighest px-2"
>
	<input
		type="text"
		placeholder={`${m.librarySearch()} ${name.toLowerCase()}`}
		class="h-12 w-60 grow bg-transparent pl-2 text-body-md placeholder:text-onSurface/54 focus:outline-none"
		oninput={(e) => searchHandler(e as unknown as InputEvent)}
	/>

	<Separator vertical class="my-auto h-6" />

	<IconButton icon="sort" tooltip="Open sort menu" onclick={sortMenuHandler} />

	<IconButton
		class={clx(store.order === 'desc' && 'rotate-180', 'transition-transform')}
		icon="sortAscending"
		tooltip="Toggle sort order"
		onclick={() => {
			store.order = store.order === 'asc' ? 'desc' : 'asc'
		}}
	/>

	<Separator vertical class="my-auto h-6" />

	<IconButton
		ariaLabel="Application menu"
		tooltip="Open application menu"
		icon="moreVertical"
		onclick={generalMenuHandler}
	/>
</div>
