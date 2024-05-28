export const useMediaQuery = (query: string) => {
	const queryList = window.matchMedia(query)

	let isMatched = $state(queryList.matches)

	queryList.addEventListener('change', (event) => {
		isMatched = event.matches
	})

	return {
		get value() {
			return isMatched
		},
	}
}
