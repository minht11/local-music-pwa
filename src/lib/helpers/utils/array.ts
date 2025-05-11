export const shuffleArray = <T>(array: T[]): void => {
	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		const temp = array[i] as T

		array[i] = array[j] as T
		array[j] = temp
	}
}
