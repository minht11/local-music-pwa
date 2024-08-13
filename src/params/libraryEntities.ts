import type { ParamMatcher } from '@sveltejs/kit'

const entities = new Set(['tracks', 'albums', 'artists', 'playlists'] as const)

type TypeFromSet<T extends Set<unknown>> = T extends Set<infer U> ? U : never
type Entity = TypeFromSet<typeof entities>

export const match = ((param): param is Entity =>
	entities.has(param as Entity)) satisfies ParamMatcher
