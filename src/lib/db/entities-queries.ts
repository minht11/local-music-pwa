import { getAllKeys } from './get-db'
import { query } from './query'

export const queryEntityKeys = () =>
	query({
		initialValue: [],
		fetcher: () => getAllKeys('artists', 'name'),
		onDatabaseChange(e, actions) {
			// actions.mutate(e)
		},
	})
