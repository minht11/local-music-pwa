<script lang="ts">
	import { goto } from '$app/navigation'
	import IconButton from '$lib/components/IconButton.svelte'
	import MenuButton from '$lib/components/MenuButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import { navigateToExternal } from '$lib/helpers/utils/navigate.ts'
	import type { PageData } from './$types.ts'

	interface Props {
		name: string
		sortOptions: PageData['sortOptions']
		store: PageData['store']
	}

	const { name, sortOptions, store }: Props = $props()

	const searchHandler = debounce((e: InputEvent) => {
		const term = (e.target as HTMLInputElement).value

		store.searchTerm = term
		queueMicrotask(() => {
			window.scrollTo({ top: 0, behavior: 'instant' })
		})
	}, 300)

	const generalMenuItems = () => {
		const menuItems = [
			{
				label: m.settings(),
				action: () => {
					goto('/settings')
				},
			},
			{
				label: m.about(),
				action: () => {
					goto('/about')
				},
			},
			{
				label: m.foundAnIssue(),
				action: () => {
					navigateToExternal('https://github.com/minht11/local-music-pwa/issues/new')
				},
			},
		]

		return menuItems
	}

	const sortMenuItems = $derived.by(() =>
		sortOptions().map((option) => ({
			label: option.name,
			selected: store.sortByKey === option.key,
			action: () => {
				store.sortByKey = option.key
			},
		})),
	)
</script>

<div
	class="@container sticky top-2 z-1 mt-2 mb-4 ml-auto flex w-full max-w-125 items-center gap-1 rounded-lg border border-primary/10 bg-surfaceContainerHighest px-2 @sm:gap-2"
>
	<input
		value={store.searchTerm}
		type="text"
		name="search"
		placeholder={`${m.librarySearch()} ${name.toLowerCase()}`}
		class="h-12 w-60 grow bg-transparent pl-2 text-body-md placeholder:text-onSurface/54 focus:outline-none"
		oninput={(e) => searchHandler(e as unknown as InputEvent)}
	/>

	<Separator vertical class="my-auto hidden h-6 @sm:flex" />

	{#if sortMenuItems.length > 1}
		<MenuButton icon="sort" tooltip={m.libraryOpenSortMenu()} menuItems={sortMenuItems} />
	{/if}

	<IconButton
		class={[store.order === 'desc' && 'rotate-180', 'transition-transform']}
		icon="sortAscending"
		tooltip={m.libraryToggleSortOrder()}
		onclick={() => {
			store.order = store.order === 'asc' ? 'desc' : 'asc'
		}}
	/>

	<Separator vertical class="my-auto hidden h-6 @sm:flex" />

	<MenuButton
		ariaLabel={m.libraryToggleSortOrder()}
		tooltip={m.libraryOpenApplicationMenu()}
		menuItems={generalMenuItems}
		width={200}
	/>
</div>
