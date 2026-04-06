import { SvelteSet } from 'svelte/reactivity'

export class SelectionTracker {
	#selectedIds: Set<number> = new SvelteSet<number>()
	#selectionEnabled = $state(false)

	get selectedIds() {
		return Array.from(this.#selectedIds)
	}

	get selectionEnabled() {
		return this.#selectionEnabled
	}

	rangeAnchor: number | null = null

	enterSelectionMode() {
		this.#selectionEnabled = true
	}

	toggle(id: number, index: number) {
		if (this.#selectedIds.has(id)) {
			this.#selectedIds.delete(id)
		} else {
			this.#selectedIds.add(id)
		}

		this.#selectionEnabled = this.#selectedIds.size > 0
		if (this.#selectionEnabled) {
			this.rangeAnchor = index
		} else {
			this.rangeAnchor = null
		}
	}

	select(id: number, index: number) {
		this.#selectedIds.add(id)
		this.#selectionEnabled = true
		this.rangeAnchor = index
	}

	unselect(id: number) {
		this.#selectedIds.delete(id)
		this.#selectionEnabled = this.#selectedIds.size > 0
		if (!this.#selectionEnabled) {
			this.rangeAnchor = null
		}
	}

	selectMany(ids: readonly number[]) {
		for (const id of ids) {
			this.#selectedIds.add(id)
		}

		this.#selectionEnabled = this.#selectedIds.size > 0
	}

	unselectMany(ids: readonly number[]) {
		for (const id of ids) {
			this.#selectedIds.delete(id)
		}

		this.#selectionEnabled = this.#selectedIds.size > 0
		if (!this.#selectionEnabled) {
			this.rangeAnchor = null
		}
	}

	/** Sets rangeAnchor only when there is no anchor yet (hover-preview entry point). */
	setHoverAnchor(index: number) {
		if (this.rangeAnchor === null) {
			this.rangeAnchor = index
		}
	}

	/** Clears rangeAnchor when no items are selected (Shift release with no selection). */
	clearHoverAnchor() {
		if (!this.#selectionEnabled) {
			this.rangeAnchor = null
		}
	}

	has(id: number) {
		return this.#selectedIds.has(id)
	}

	clear() {
		this.#selectedIds.clear()
		this.#selectionEnabled = false
		this.rangeAnchor = null
	}

	get size() {
		return this.#selectedIds.size
	}
}
