import { defineParams } from '@sveltejs/kit/params'

const libraryEntitiesSlugs = ['tracks', 'albums', 'artists', 'playlists'] as const
type LibraryEntitiesSlug = (typeof libraryEntitiesSlugs)[number]

const entities = new Set(libraryEntitiesSlugs)

export const params = defineParams({
	libraryEntities: (param: string) =>
		entities.has(param as LibraryEntitiesSlug) ? (param as LibraryEntitiesSlug) : undefined,
})
