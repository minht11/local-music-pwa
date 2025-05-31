import { SvelteSet } from 'svelte/reactivity'

let counter = 0
const pendingTasks = new SvelteSet<number>()
/**
 * Returns reactive boolean value stating if database operation is pending.
 */
export const isDatabaseOperationPending = (): boolean => pendingTasks.size > 0

/**
 * Prevents other tasks using this function from running while one is pending.
 * Works between different tabs/threads using the
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API Web Locks API }
 *
 * Generally, should only be used for long-running database mutation operations.
 */
export const lockDatabase = async <T = void>(action: () => Promise<T>): Promise<T> => {
	const id = counter
	counter += 1
	pendingTasks.add(id)

	try {
		return await navigator.locks.request('database', () => action())
	} finally {
		pendingTasks.delete(id)
	}
}
