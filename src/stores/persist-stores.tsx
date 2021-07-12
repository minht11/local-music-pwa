import { createEffect, createSignal, on, Show, Component, lazy } from 'solid-js'
import { unwrap } from 'solid-js/store'
import {
  createStore as createStoreIDB,
  getMany as getManyIDB,
  set as setIDB,
} from 'idb-keyval'
import isDBReadySafari14Fix from 'safari-14-idb-fix'
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
  onLoad: () => void
  storageName: string
  version: number
  useStores: readonly UseStore[]
}

export const PersistStoresC: Component<PersistStoresProps> = (props) => {
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

  getManyIDB(persistedKeys, storeIDB)
    .then((values) => {
      values.forEach((value, index) => {
        if (value !== undefined) {
          persistedItems[index].load(value)
        }
      })
    })
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
          if (skippedSetup) {
            setIDB(item.key, unwrap(value), storeIDB)
          }
        })
      })

      // createEffect doesn't fire synchronously
      createEffect(() => {
        skippedSetup = true
      })

      props.onLoad()
    }),
  )

  return <Show when={isLoaded()}>{props.children}</Show>
}

const loadSafariIDBBugFix = async () => {
  await isDBReadySafari14Fix()
  return { default: PersistStoresC }
}

export const PersistStoresProvider = lazy(() => loadSafariIDBBugFix())
