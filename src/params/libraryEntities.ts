const libraryEntitiesPaths = ['tracks', 'albums', 'artists', 'playlists'] as const
type LibraryEntitiesPath = typeof libraryEntitiesPaths[number]

const entities = new Set(libraryEntitiesPaths)

export const match = (param): param is LibraryEntitiesPath =>
	entities.has(param as LibraryEntitiesPath)
