/**
 * Checks if the given element is a text input (input[type="text"] or textarea).
 */
export const isElementTextInput = (element: Element | EventTarget | undefined | null) => {
	if (
		(element instanceof HTMLInputElement && element.type === 'text') ||
		element instanceof HTMLTextAreaElement
	) {
		return true
	}

	return false
}
