<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
</script>

<section class="m-auto flex flex-col items-center select-text">
	<div class="mb-4 text-headline-md">{m.appName()}</div>

	<div
		class="flex flex-col gap-4 rounded-lg border border-primary/10 bg-surfaceContainerLowest px-4 py-2"
	>
		<div class="flex justify-between gap-4">
			<a
				href="https://github.com/minht11/local-music-pwa"
				rel="noopener"
				target="_blank"
				class="link flex items-center gap-2"
			>
				<Icon type="github" class="size-4" />
				{m.aboutSourceCode()}
			</a>

			<a
				href="https://github.com/minht11/local-music-pwa#privacy"
				rel="noopener"
				target="_blank"
				class="link"
			>
				{m.aboutPrivacy()}
			</a>
		</div>
	</div>

	<Button as="a" href="/" target="_blank" kind="flat" class="mt-2">{m.aboutHomepage()}</Button>
</section>
