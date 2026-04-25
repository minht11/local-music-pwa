import type { ComponentProps } from 'svelte'
import type { APP_DIALOGS_COMPONENTS_MAP, AppDialogKey } from '$lib/components/app-dialogs/dialogs'
import type { DialogData, DialogOpenAccessor } from '$lib/components/dialog/Dialog.svelte'

type DialogOpenProp<K extends AppDialogKey> = ComponentProps<
	(typeof APP_DIALOGS_COMPONENTS_MAP)[K]
>['open']

type StateMap = {
	[K in AppDialogKey]?: DialogData<DialogOpenProp<K>>
}

type DialogState<K extends AppDialogKey> = NonNullable<StateMap[K]>

type BooleanProps = {
	[K in AppDialogKey]: DialogState<K> extends boolean ? K : never
}[AppDialogKey]

export class DialogsStore {
	#stateMap: StateMap = $state({})

	/** Returning new object each time is fine since components are rendered only once on app load */
	// biome-ignore lint/suspicious/noExplicitAny: dialog component fails to infer it
	getAccessor(key: AppDialogKey): DialogOpenAccessor<any> {
		return {
			get: () => this.#stateMap[key] ?? null,
			close: () => {
				this.closeDialog(key)
			},
		}
	}

	openDialog<K extends BooleanProps>(dialog: K, open?: boolean): void
	openDialog<K extends Exclude<AppDialogKey, BooleanProps>>(dialog: K, open: DialogState<K>): void
	openDialog<K extends AppDialogKey>(dialog: K, open: DialogState<K>) {
		this.#stateMap[dialog] = open ?? true
	}

	closeDialog<K extends AppDialogKey>(dialog: K) {
		this.#stateMap[dialog] = undefined
	}
}
