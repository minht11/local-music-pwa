import type { PageLoad } from './$types.ts'

export const load: PageLoad = (): { title: string } => ({
	title: m.about(),
})
