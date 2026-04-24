const twoDigits = (num: number) => num.toString().padStart(2, '0')

export const formatDuration = (seconds: number) => {
	if (!Number.isFinite(seconds)) {
		return '--:--'
	}

	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)

	return `${hours ? `${hours}:` : ''}${twoDigits(minutes)}:${twoDigits(secs)}`
}
