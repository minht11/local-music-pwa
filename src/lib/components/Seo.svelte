<script lang="ts">
	import { page } from '$app/state'
	import { APP_DESCRIPTION_EN, APP_NAME_EN } from '$lib/app-metadata.ts'
	import thumbnail from '$lib/assets/thumbnail.jpg?as=metadata'

	interface Props {
		schema?: Record<string, unknown> | Record<string, unknown>[]
	}

	const { schema }: Props = $props()

	const seoTitle = `${APP_NAME_EN} - Private offline local music player in your browser`
	const seoDescription = APP_DESCRIPTION_EN

	const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href)
</script>

<svelte:head>
	<title>{seoTitle}</title>

	<meta name="description" content={seoDescription} />

	<meta property="og:type" content="website" />
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={seoDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={thumbnail.src} />
	<meta property="og:image:alt" content="Snae Player showing the library and player interface" />
	<meta property="og:logo" content="/icons/responsive.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seoTitle} />
	<meta name="twitter:description" content={seoDescription} />
	<meta name="twitter:image" content={thumbnail.src} />

	<meta
		name="keywords"
		content="local music player, offline music player, browser music player, android music player, ios music player, chromebook music player, windows music player, macos music player, play music from device, private music player, playlists, queue, favorites, equalizer, playback speed control"
	/>

	<link rel="canonical" href={canonicalUrl} />

	{#if schema}
		{@html `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`}
	{/if}
</svelte:head>
