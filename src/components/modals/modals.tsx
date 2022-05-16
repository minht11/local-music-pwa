import { nanoid } from 'nanoid'
import {
  createContext,
  For,
  useContext,
  JSX,
  lazy,
  ParentComponent,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { Dynamic } from 'solid-js/web'
import { InternalModalProps } from './types'
import * as styles from './modals.css'

const MODALS = {
  viewArtists: lazy(() => import('./view-artists/view-artists')),
  addToPlaylists: lazy(
    () => import('./add-to-playlist-modal/add-to-playlist-modal'),
  ),
  createOrRenamePlaylist: lazy(
    () => import('./create-or-rename-playlist/create-or-rename-playlist'),
  ),
} as const

type UnwrapComponentProps<T> = T extends (props: infer U) => JSX.Element ? U : T

type ModalsType = typeof MODALS
type ModalsKey = keyof ModalsType
type ModalProps<K extends ModalsKey> = UnwrapComponentProps<ModalsType[K]>

type ModalsActions = {
  [key in ModalsKey]: {
    show(props: Omit<ModalProps<key>, keyof InternalModalProps>): void
  }
}

interface ModalStateItem<K extends ModalsKey = ModalsKey> {
  id: string
  key: K
  modalProps: ModalProps<K>
  close(this: void): void
}

interface ModalsState {
  modals: ModalStateItem[]
}

const ModalContext = createContext<ModalsActions>()
export const useModals = () => useContext(ModalContext) as ModalsActions

export const ModalsProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<ModalsState>({
    modals: [],
  })

  const modalsKeyList = Object.keys(MODALS) as ModalsKey[]
  const modalActionEntries = modalsKeyList.map((key) => {
    const show = (
      modalProps: Exclude<ModalProps<typeof key>, keyof InternalModalProps>,
    ) => {
      const id = nanoid()

      const close = () => {
        setState('modals', (modals) => modals.filter((m) => m.id !== id))
      }

      const newModal = {
        id,
        key,
        modalProps,
        close,
      }

      setState('modals', [...state.modals, newModal])
    }

    return [key, { show }] as const
  })

  const actions = Object.fromEntries(
    modalActionEntries,
  ) as unknown as ModalsActions

  return (
    <ModalContext.Provider value={actions}>
      <div class={styles.modalsContainer}>
        <For each={state.modals}>
          {(modalProps) => (
            <>
              <div class={styles.scrim} onClick={() => modalProps.close()} />
              <Dynamic
                component={
                  MODALS[modalProps.key] as (
                    props: ModalProps<typeof modalProps.key>,
                  ) => JSX.Element
                }
                {...modalProps.modalProps}
                close={modalProps.close}
              />
            </>
          )}
        </For>
      </div>

      {props.children}
    </ModalContext.Provider>
  )
}
