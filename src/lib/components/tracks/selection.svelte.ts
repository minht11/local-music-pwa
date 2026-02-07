import { SvelteSet } from 'svelte/reactivity'

export class SelectionTracker {
	#selectedIds: Set<number> = new SvelteSet<number>()

	get selectedIds() {
		return Array.from(this.#selectedIds)
	}

	selectionEnabled = $state(false)

	lastSelectedIndex: number | null = null

	toggle(id: number, index: number) {
		if (this.#selectedIds.has(id)) {
			this.#selectedIds.delete(id)
		} else {
			this.#selectedIds.add(id)
		}

		this.selectionEnabled = this.#selectedIds.size > 0
		if (this.selectionEnabled) {
			this.lastSelectedIndex = index
		} else {
			this.lastSelectedIndex = null
		}
	}

	select(id: number, index: number) {
		this.#selectedIds.add(id)
		this.selectionEnabled = true
		this.lastSelectedIndex = index
	}

	unselect(id: number) {
		this.#selectedIds.delete(id)
		this.selectionEnabled = this.#selectedIds.size > 0
		if (!this.selectionEnabled) {
			this.lastSelectedIndex = null
		}
	}

	selectMany(ids: readonly number[]) {
		for (const id of ids) {
			this.#selectedIds.add(id)
		}

		this.selectionEnabled = this.#selectedIds.size > 0
	}

	unselectMany(ids: readonly number[]) {
		for (const id of ids) {
			this.#selectedIds.delete(id)
		}

		this.selectionEnabled = this.#selectedIds.size > 0
		if (!this.selectionEnabled) {
			this.lastSelectedIndex = null
		}
	}

	has(id: number) {
		return this.#selectedIds.has(id)
	}

	clear() {
		this.#selectedIds.clear()
		this.selectionEnabled = false
		this.lastSelectedIndex = null
	}

	get size() {
		return this.#selectedIds.size
	}
}
