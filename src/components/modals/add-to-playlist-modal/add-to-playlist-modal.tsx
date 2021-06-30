import { createSignal } from 'solid-js'
import { useEntitiesStore } from '../../../stores/stores'
import { IconType } from '../../icon/icon-paths'
import { Modal } from '../../modal/modal'
import { PlaylistList } from '../../entities-lists/playlists-list/playlists-list'
import { InternalModalProps } from '../types'

interface AddToPlaylistModalProps extends InternalModalProps {
  trackIds: readonly string[]
}

export const AddToPlaylistModal = (props: AddToPlaylistModalProps) => {
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

  return (
    <Modal
      titleIcon={IconType.ADD_PLAYLIST}
      title='Add to playlist'
      onCancel={props.close}
      onConfirm={onConfirm}
      buttons={[
        { type: 'cancel', title: 'Cancel' },
        { type: 'confirm', title: 'Add', disabled: !selected() },
      ]}
    >
      <PlaylistList
        hideSubheader
        hideFavorites
        disableMenu
        items={Object.keys(entities.playlists)}
        selectedId={selected()}
        onItemClick={onItemClick}
      />
    </Modal>
  )
}
