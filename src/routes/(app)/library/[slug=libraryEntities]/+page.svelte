<script>
	import Icon from '$lib/components/icon/Icon.svelte'
</script>

<div class="m-auto flex flex-col items-center justify-center gap-4 py-10">
	<Icon type="album" class="my-auto size-35 opacity-54" />

	<div class="relative flex flex-col">
		<div class="max-w-50 text-center text-body-lg">
			{m.librarySelectSomethingToBeShown()}
		</div>

		<!-- Down hand drawn arrow by kiddo from Noun Project (CC BY 3.0) -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 100 125"
			class="absolute -bottom-30 -left-6 h-30 fill-current opacity-54"
		>
			<path
				d="M20.1 80.9c-.1.6-.2 2 .5 2 8.3.3 16.6 1 24.8 2.1.8.1 1.3-1 1.5-1.7.1-.5.4-2.1-.5-2.2-7.3-1-14.6-1.6-21.9-1.9 11.4-3.6 23-7.3 33-14 4.6-3.1 8.9-6.8 12.4-11.1 3.9-4.8 6.6-10.3 8.2-16.2 1.9-7.1 2.3-14.5 1.7-21.7 0-.6-.4-1.5-1.1-1-.7.5-1.1 1.7-1 2.6.4 5.9.3 12-1 17.8-1.2 5.4-3.4 10.3-6.8 14.7-6.8 8.7-16.5 14.5-26.5 18.6-5.4 2.2-10.9 4-16.5 5.8 2.7-4 4.7-8.5 5.9-13.2.1-.6.3-1.9-.5-2.2-.8-.2-1.3 1.2-1.5 1.7-1.6 6.5-5.1 12.4-10.1 17.1-.6.6-.9 1.9-.7 2.7 0 0 0 .1.1.1z"
			/>
		</svg>
	</div>
</div>
