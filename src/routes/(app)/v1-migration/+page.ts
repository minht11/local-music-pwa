import { createTracksCountPageQuery } from '$lib/library/tracks-queries.ts'

interface LoadResult {
	noPlayerOverlay: boolean
	tracksCount: Awaited<ReturnType<typeof createTracksCountPageQuery>>
}

export const load = async (): Promise<LoadResult> => {
	const tracksCount = await createTracksCountPageQuery()

	return {
		tracksCount,
		noPlayerOverlay: true,
	}
}
