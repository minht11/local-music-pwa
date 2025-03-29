import type { PageLoad } from './$types.ts'

export const load: PageLoad = () => {
	return {
		title: m.about(),
	}
}
