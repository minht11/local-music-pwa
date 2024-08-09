export const wait = (duration: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, duration)
	})
