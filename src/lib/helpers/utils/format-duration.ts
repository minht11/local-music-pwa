const twoDigits = (num: number) => (num < 10 ? `0${num}` : num)

export const formatDuration = (seconds: number) => {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)

	return `${hours ? `${hours}:` : ''}${twoDigits(minutes)}:${twoDigits(secs)}`
}
