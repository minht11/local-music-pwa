import type { ParamMatcher } from '@sveltejs/kit'

const entities = ['tracks', 'albums', 'artists', 'playlists']

export const match: ParamMatcher = (param): param is 'tracks' => entities.includes(param)
