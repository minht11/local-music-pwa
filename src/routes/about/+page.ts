import type { PageLoad } from './$types.ts'

export const load = (() => {
	return {
		title: m.about(),
	}
}) satisfies PageLoad
