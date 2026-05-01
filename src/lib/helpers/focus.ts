export const doesElementHasFocus = (element: Element): boolean => element.matches(':focus')

export const findFocusedElement = (container: Element | Document): HTMLElement | null => {
	const element = container.querySelector(':focus')

	// If element contains focus it must be instanceof HTMLElement,
	// otherwise it's always null
	return element as HTMLElement | null
}
