export type ClassNameInput = string | boolean | undefined | null

export const clx = (...input: ClassNameInput[]): string => {
	let className = ''
	for (const value of input) {
		if (value) {
			className += ` ${value}`
		}
	}

	return className
}
