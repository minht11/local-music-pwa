// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Impossible<K extends keyof any> = {
	[P in K]: never
}

export const assign = <T extends {}, S extends Partial<T>>(
	target: T,
	source: S & Impossible<Exclude<keyof S, keyof T>>,
): S & T => Object.assign(target, source)
