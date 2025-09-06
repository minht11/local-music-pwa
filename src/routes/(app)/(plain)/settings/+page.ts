interface LoadResult {
	title: string
}

export const load = async (): Promise<LoadResult> => {
	return {
		title: 'Settings',
	}
}
