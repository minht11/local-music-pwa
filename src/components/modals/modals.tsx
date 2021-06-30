import { nanoid } from 'nanoid'
import { Component, createContext, For, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { Dynamic } from 'solid-js/web'
import { TransitionGroup } from 'solid-transition-group'
import { AddToPlaylistModal } from './add-to-playlist-modal/add-to-playlist-modal'
import { CreateOrRenamePlaylistModal } from './create-or-rename-playlist/create-or-rename-playlist'
import { InternalModalProps } from './types'
import { ViewArtistsModal } from './view-artists/view-artists'
import { animateFade } from '../../helpers/animations/animations'
import { EASING_INCOMING_80 } from '../../helpers/animations/view-transition'
import * as styles from './modals.css'
import { prefersReducedMotion } from '../../utils'

const MODALS = {
  viewArtists: ViewArtistsModal,
  addToPlaylists: AddToPlaylistModal,
  createOrRenamePlaylist: CreateOrRenamePlaylistModal,
} as const

type UnwrapComponentProps<T> = T extends Component<infer U> ? U : T

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
  close(): void
}

interface ModalsState {
  modals: ModalStateItem[]
}

const ModalContext = createContext<ModalsActions>()
export const useModals = () => useContext(ModalContext) as ModalsActions

export const ModalsProvider: Component = (props) => {
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

  const onEnter = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    if (element.classList.contains(styles.scrim)) {
      animateFade(element, false, { duration: 150, easing: 'linear' }).then(
        done,
      )
    } else {
      animateFade(element, false, { duration: 45, easing: 'linear' })
      element
        .animate(
          {
            transform: ['scale(.8)', 'none'],
          },
          {
            duration: 150,
            easing: EASING_INCOMING_80,
          },
        )
        .finished.then(done)
    }
  }

  const onExit = (element: Element, done: () => void) => {
    if (prefersReducedMotion()) {
      done()
      return
    }

    animateFade(element, true, { duration: 150, easing: 'linear' }).then(done)
  }

  return (
    <ModalContext.Provider value={actions}>
      <div className={styles.modalsContainer}>
        <TransitionGroup onEnter={onEnter} onExit={onExit}>
          <For each={state.modals}>
            {(modalProps) => (
              <>
                <div
                  className={styles.scrim}
                  onClick={() => modalProps.close()}
                />
                <Dynamic
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  component={MODALS[modalProps.key] as any}
                  {...modalProps.modalProps}
                  close={modalProps.close}
                />
              </>
            )}
          </For>
        </TransitionGroup>
      </div>

      {props.children}
    </ModalContext.Provider>
  )
}
