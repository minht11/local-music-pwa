import type { PageLoad } from './$types.ts'

export const load: PageLoad = (): { title: string } => {
	return {
		title: m.about(),
	}
}
