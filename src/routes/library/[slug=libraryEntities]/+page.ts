import type { PageLoad } from './$types'

export const load: PageLoad = async (event) => {
	const data = await event.parent()

	return {
		pageTitle: `Library - ${data.store.pluralTitle}`,
	}
}
