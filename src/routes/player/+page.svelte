<section
	class="overlay mx-auto grid flex-grow grid-cols-[400px_1fr] h-full bg-surface rounded-t-24 tonal-elevation-2"
>
	<div class="bg-secondaryContainer h-full w-full flex flex-col rounded-t-24 overflow-hidden">
		Player controls

		<div class="bg-surface h-56 mt-auto tonal-elevation-2"></div>
	</div>

	<div class="w-full">Queue list</div>
</section>

<style>
	/* :root::view-transition-old(root),
	:root::view-transition-new(root) {
		animation-duration: 500ms;
	} */

	.overlay {
		view-transition-name: player-overlay;
	}
</style>
