import { getContext, setContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

export interface BottomBarState {
	bottomBar: Snippet | null
	abovePlayer: SvelteMap<string, Snippet>
}

const key = Symbol('root-layout')

export const setupOverlaySnippets = () => {
	const state: BottomBarState = $state({
		bottomBar: null,
		abovePlayer: new SvelteMap<string, Snippet>(),
	})

	setContext(key, state)

	return {
		get bottomBar(): BottomBarState['bottomBar'] {
			return state.bottomBar
		},
		get abovePlayer(): Snippet[] {
			return [...state.abovePlayer.values()]
		},
	}
}

export const useSetOverlaySnippet = (
	type: 'bottom-bar' | 'above-player',
	getSnippet: () => Snippet | null,
): void => {
	const state = getContext<BottomBarState>(key)
	const id = crypto.randomUUID()

	$effect.pre(() => {
		if (type === 'bottom-bar') {
			state.bottomBar = getSnippet()

			return () => {
				state.bottomBar = null
			}
		}

		if (type === 'above-player') {
			const snippet = getSnippet()

			if (snippet) {
				state.abovePlayer.set(id, snippet)
			} else {
				state.abovePlayer.delete(id)
			}

			return () => {
				state.abovePlayer.delete(id)
			}
		}

		return
	})
}
