declare const BASE_LOCALE: string
declare const LOCALES: string[]
declare const LOCALES_MAP: Record<string, string>
declare const LOCAL_STORAGE_KEY: string
declare const MESSAGES_MODULE_ID: string

{
	const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
	const locale = saved && LOCALES.includes(saved) ? saved : BASE_LOCALE

	document.documentElement.lang = locale

	const script = document.createElement('script')
	script.type = 'importmap'
	script.textContent = JSON.stringify({
		imports: { [MESSAGES_MODULE_ID]: LOCALES_MAP[locale] },
	})
	document.head.appendChild(script)
}
