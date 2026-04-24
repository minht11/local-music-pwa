const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'password', 'number'])

/**
 * Checks if the given element is a text input (input[type="text"] or textarea).
 */
export const isElementTextInput = (element: Element | EventTarget | undefined | null) => {
	if (
		(element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type)) ||
		element instanceof HTMLTextAreaElement
	) {
		return true
	}

	return false
}
