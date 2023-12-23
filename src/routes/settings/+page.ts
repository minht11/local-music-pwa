import type { PageLoad } from './$types'

export const load = (() => {
	return {
		backButton: true,
		title: 'Settings',
	}
}) satisfies PageLoad
