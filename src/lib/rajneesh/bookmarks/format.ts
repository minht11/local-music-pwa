import { formatDuration } from '$lib/helpers/utils/format-duration.ts'

export const formatBookmarkTimestamp = (seconds: number): string =>
	formatDuration(Math.max(0, Math.floor(seconds)))
