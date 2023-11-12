import type { ParamMatcher } from '@sveltejs/kit'

const entities = ['tracks', 'albums', 'artists', 'playlists'] as const
type Entity = typeof entities[number]

export const match = ((param): param is Entity => entities.includes(param as Entity)) satisfies ParamMatcher
