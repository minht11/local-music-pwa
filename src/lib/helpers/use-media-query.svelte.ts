export const useMediaQuery = (query: string) => {
	const queryList = window.matchMedia(query)

	let isMatched = $state(queryList.matches)

	queryList.addEventListener('change', (event) => {
		console.log('event', event.matches)
		isMatched = event.matches
	})

	return {
		get value() {
			return isMatched
		},
	}
}
