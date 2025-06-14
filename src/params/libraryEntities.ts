const libraryEntitiesSlugs = ['tracks', 'albums', 'artists', 'playlists'] as const
type LibraryEntitiesSlug = (typeof libraryEntitiesSlugs)[number]

const entities = new Set(libraryEntitiesSlugs)

export const match = (param): param is LibraryEntitiesSlug =>
	entities.has(param as LibraryEntitiesSlug)
