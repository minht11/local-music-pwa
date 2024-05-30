<script lang="ts">
	import { goto } from '$app/navigation'
	import { ripple } from '$lib/actions/ripple'
	import IconButton from '$lib/components/IconButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { debounce } from '$lib/helpers/utils.ts'
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

	let searchWidth = $state(0)
	let actionsBelow = $derived(searchWidth < 400)
</script>

{#snippet sortActions()}
	<button
		use:ripple
		class="flex interactable shrink-0 w-96px rounded-8px h-40px pl-12px pr-4px gap-4px items-center text-label-md"
		onclick={sortMenuHandler}
	>
		{store.sortBy?.name}

		<Icon type="menuDown" class="size-20px ml-auto" />
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

<div
	bind:clientWidth={searchWidth}
	class="sticky @container top-8px my-24px z-1 bg-surfaceContainerHighest flex w-full rounded-8px px-8px gap-8px items-center ml-auto max-w-500px"
>
	<input
		value={store.searchTerm}
		type="text"
		placeholder="Search tracks"
		class="h-48px w-240px pl-8px grow placeholder:text-onSurface/54 text-body-md bg-transparent focus:outline-none"
		oninput={(e) => searchHandler(e as unknown as InputEvent)}
	/>

	{#if !actionsBelow}
		<Separator vertical class="h-24px my-auto" />

		{@render sortActions()}
	{/if}

	<Separator vertical class="h-24px my-auto" />

	<IconButton ariaLabel="Application menu" icon="moreVertical" onclick={generalMenuHandler} />
</div>

{#if actionsBelow}
	<div class="mx-auto w-full max-w-500px mb-24px -mt-40px @md:hidden">
		<div
			class="flex items-center w-max ml-auto bg-surfaceContainerHigh rounded-t-8px rounded-b-16px pt-16px"
		>
			{@render sortActions()}
		</div>
	</div>
{/if}
