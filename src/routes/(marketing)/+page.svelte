<script lang="ts">
	import Button from '$lib/components/Button.svelte'

	const features = [
		{
			title: 'Full offline support. Your data, on your device.',
			description:
				'Snae player is local only browser. No data is sent to the cloud, and no internet connection is required to use it. Your music library is stored locally on your device, ensuring your privacy and security.',
		},
		{
			title: 'Dynamic UI color theming',
			description:
				'The app automatically adapts to your system theme, providing a seamless experience whether you prefer light or dark mode. You can also customize the color palette to match your personal style.',
		},
	]
</script>

<header class="flex h-16 w-full items-center justify-between bg-surfaceContainerHigh px-4">
	<div class="text-title-md">Snae player</div>

	<Button as="a" href="/library/tracks" kind="toned">Open the app</Button>
</header>

<section class="flex flex-col items-center bg-surfaceContainer px-10 py-20">
	<h1 class="mx-auto max-w-200 text-center text-headline-sm sm:text-headline-md">
		Play your local music files right in your browser
	</h1>

	<Button as="a" href="/library/tracks" class="mt-6 w-full max-w-50">Open the app</Button>
</section>

<section class="content-width mt-6">
	<h2>Features</h2>

	<div class="mt-6 flex flex-col gap-4 sm:flex-row">
		{#each features as feature}
			<div class="card w-full p-4">
				<div class="text-title-md">
					{feature.title}
				</div>

				<p class="mt-2 text-body-lg">
					{feature.description}
				</p>
			</div>
		{/each}
	</div>
</section>

<style>
	.content-width {
		width: 100%;
		max-width: 1200px;
		padding-left: 24px;
		padding-right: 24px;
		margin-left: auto;
		margin-right: auto;
	}
</style>
