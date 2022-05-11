import { createMemo, createSignal, Show } from 'solid-js'
import { useEntitiesStore } from '../../../stores/stores'
import { Modal } from '../../modal/modal'
import { PlaylistList } from '../../entities-lists/playlists-list/playlists-list'
import { InternalModalProps } from '../types'
import { MessageBanner } from '../../message-banner/message-banner'

export interface AddToPlaylistModalProps extends InternalModalProps {
  trackIds: readonly string[]
}

const AddToPlaylistModal = (props: AddToPlaylistModalProps) => {
  const [entities, entitiesActions] = useEntitiesStore()
  const [selected, setSelected] = createSignal<string>()

  const onConfirm = () => {
    const id = selected()
    if (id) {
      entitiesActions.addTracksToPlaylist(id, props.trackIds)
      props.close()
    }
  }

  const onItemClick = (id: string) => {
    setSelected(id)
  }

  const items = createMemo(() => Object.keys(entities.playlists))

  return (
    <Modal
      title='Add to playlist'
      onCancel={props.close}
      onConfirm={onConfirm}
      buttons={[
        { type: 'cancel', title: 'Cancel' },
        { type: 'confirm', title: 'Add', disabled: !selected() },
      ]}
    >
      <Show
        when={items().length}
        fallback={<MessageBanner message='No Playlists' />}
      >
        <PlaylistList
          hideFavorites
          disableMenu
          items={Object.keys(entities.playlists)}
          selectedId={selected()}
          onItemClick={onItemClick}
        />
      </Show>
    </Modal>
  )
}

export default AddToPlaylistModal
