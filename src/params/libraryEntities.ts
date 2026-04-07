const libraryEntitiesSlugs = [
	'tracks',
	'albums',
	'artists',
	'playlists',
	'bookmarks',
	'home',
	'shorts',
	'explore',
] as const
type LibraryEntitiesSlug = (typeof libraryEntitiesSlugs)[number]

const entities = new Set(libraryEntitiesSlugs)

export const match = (param): param is LibraryEntitiesSlug =>
	entities.has(param as LibraryEntitiesSlug)
