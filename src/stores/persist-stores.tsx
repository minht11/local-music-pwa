import { trackStore } from '@solid-primitives/deep'
import {
  createEffect,
  createSignal,
  on,
  Show,
  ParentComponent,
} from 'solid-js'
import { unwrap } from 'solid-js/store'
import {
  createStore as createStoreIDB,
  getMany as getManyIDB,
  set as setIDB,
} from 'idb-keyval'
import { deleteIDBDatabases } from '../helpers/delete-idb-databases'

// TODO. Generics arrays with mixed types are hard, fix this one day. Maybe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PersistedItem<V = any> {
  key: string
  selector: () => V
  load: (value: V) => void
}

type UseStore = () => readonly [unknown, unknown, readonly PersistedItem[]]

export interface PersistStoresProps {
  onLoad?: () => void
  storageName: string
  version: number
  useStores: readonly UseStore[]
}

export const PersistStoresProvider: ParentComponent<PersistStoresProps> = (
  props,
) => {
  const persistedItems: readonly PersistedItem[] = props.useStores
    .map((stateFn) => stateFn()[2])
    .filter(Boolean)
    .flat(1)

  const { storageName, version } = props

  const [isLoaded, setIsLoaded] = createSignal(false)

  const fullName = `${storageName}-${version}`

  const storeIDB = createStoreIDB(fullName, fullName)
  deleteIDBDatabases(storageName, version)

  const persistedKeys = persistedItems.map((t) => t.key)

  const setInitiallyLoadedState = (values: unknown[]) => {
    values.forEach((value, index) => {
      if (value !== undefined) {
        persistedItems[index].load(value)
      }
    })
  }

  getManyIDB(persistedKeys, storeIDB)
    .then(setInitiallyLoadedState)
    .finally(() => setIsLoaded(true))

  createEffect(
    on(isLoaded, (loaded) => {
      if (!loaded) {
        return
      }

      // Don't save data on initial load.
      let skippedSetup = false
      // Listen for changes to values and save them to IDB.
      persistedItems.forEach((item) => {
        createEffect(() => {
          const value: unknown = item.selector()

          if (typeof value === 'object' && value !== null) {
            trackStore(item.selector())
          }

          if (skippedSetup) {
            setIDB(item.key, unwrap(value), storeIDB)
          }
        })
      })

      // createEffect doesn't fire synchronously
      createEffect(() => {
        skippedSetup = true
      })

      props.onLoad?.()
    }),
  )

  return <Show when={isLoaded()}>{props.children}</Show>
}
