<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import IconButton from '$lib/components/IconButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { PageData } from './$types.ts'

	interface Props {
		name: string
		sortOptions: PageData['sortOptions']
		store: PageData['store']
	}

	const { name, sortOptions, store }: Props = $props()

	let searchInput = $state<HTMLInputElement | null>(null)

	const searchHandler = debounce((e: InputEvent) => {
		const term = (e.target as HTMLInputElement).value

		store.searchTerm = term
	}, 300)

	$effect(() => {
		if (page.url.searchParams.get('focus') !== '1') {
			return
		}

		searchInput?.focus()
	})

	const searchPlaceholder = $derived.by(() => {
		const slug = page.params.slug
		if (slug === 'albums' || slug === 'explore') {
			return m.librarySearch()
		}

		return `${m.librarySearch()} ${name.toLowerCase()}`
	})
	const showSortControls = $derived(page.params.slug !== 'bookmarks')

	const sortMenuItems = $derived.by(() =>
		sortOptions().map((option) => ({
			label: option.name,
			selected: store.sortByKey === option.key,
			action: () => {
				store.sortByKey = option.key
			},
		})),
	)

	const menu = useMenu()

	const sortMenuHandler = (e: MouseEvent) => {
		menu.showFromEvent(e, sortMenuItems, {
			anchor: true,
			preferredAlignment: {
				vertical: 'top',
				horizontal: 'right',
			},
		})
	}
</script>

<div
	class="@container sticky top-2 z-1 mt-2 mb-4 flex w-full items-center gap-1 rounded-lg border border-primary/10 bg-surfaceContainerHighest px-2 @sm:gap-2"
>
	<input
		bind:this={searchInput}
		value={store.searchTerm}
		type="text"
		name="search"
		placeholder={searchPlaceholder}
		class="h-12 min-w-0 grow bg-transparent pl-2 text-body-md placeholder:text-onSurface/54 focus:outline-none"
		oninput={(e) => searchHandler(e as unknown as InputEvent)}
	/>

	<Separator vertical class="my-auto hidden h-6 @sm:flex" />

	{#if showSortControls && sortMenuItems.length > 1}
		<IconButton icon="sort" tooltip={m.libraryOpenSortMenu()} onclick={sortMenuHandler} />
	{/if}

	{#if showSortControls && page.params.slug !== 'explore'}
		<IconButton
			class={[store.order === 'desc' && 'rotate-180', 'transition-transform']}
			icon="sortAscending"
			tooltip={m.libraryToggleSortOrder()}
			onclick={() => {
				store.order = store.order === 'asc' ? 'desc' : 'asc'
			}}
		/>
	{/if}

	<Separator vertical class="my-auto hidden h-6 @sm:flex" />

	<IconButton
		ariaLabel={m.settings()}
		tooltip={m.settings()}
		icon="settings"
		onclick={() => {
			void goto('/settings')
		}}
	/>
</div>
