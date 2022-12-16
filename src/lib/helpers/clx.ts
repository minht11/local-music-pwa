export type ClassNameInput = string | boolean | undefined | null

export const clx = (...input: ClassNameInput[]) => {
	let className = ''
	for (const value of input) {
		if (value) {
			className += ` ${value}`
		}
	}

	return className
}
