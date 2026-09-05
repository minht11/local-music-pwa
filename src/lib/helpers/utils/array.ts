/** @public */
export const toShuffledArray = <T>(
	input: readonly T[],
	shouldInclude?: (item: T) => boolean,
): T[] => {
	const output = shouldInclude === undefined ? [...input] : input.filter(shouldInclude)
	for (let i = output.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		const temp = output[i] as T

		output[i] = output[j] as T
		output[j] = temp
	}

	return output
}
