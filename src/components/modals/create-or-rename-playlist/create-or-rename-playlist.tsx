import { createSignal } from 'solid-js'
import { useEntitiesStore } from '../../../stores/stores'
import { Modal } from '../../modal/modal'
import { InternalModalProps } from '../types'
import * as styles from '../../../styles/shared.css'

interface RenamePlaylistProps {
  type: 'rename'
  playlistId: string
}

interface CreatePlaylistProps {
  type: 'create'
  playlistId?: undefined
}

export type CreateRenamePlaylistProps = InternalModalProps &
  (RenamePlaylistProps | CreatePlaylistProps)

const CreateOrRenamePlaylistModal = (props: CreateRenamePlaylistProps) => {
  const [entities, entitiesActions] = useEntitiesStore()
  const [name, setName] = createSignal('')

  const isCreateType = () => props.type === 'create'

  const onConfirmHandler = () => {
    if (isCreateType()) {
      entitiesActions.createNewPlaylist(name())
    } else {
      entitiesActions.renamePlaylist(
        (props as RenamePlaylistProps).playlistId,
        name(),
      )
    }
    props.close()
  }

  return (
    <Modal
      title={`${isCreateType() ? 'Create new' : 'Rename'} playlist`}
      onConfirm={onConfirmHandler}
      onCancel={props.close}
      buttons={[
        { type: 'cancel', title: 'Cancel' },
        {
          type: 'confirm',
          title: isCreateType() ? 'Create' : 'Save',
          disabled: !name(),
        },
      ]}
    >
      <input
        value={
          !isCreateType()
            ? entities.playlists[(props as RenamePlaylistProps).playlistId].name
            : ''
        }
        type='text'
        placeholder='Enter new playlist name'
        class={styles.textField}
        onInput={(e: InputEvent) =>
          setName((e.target as HTMLInputElement).value)
        }
      />
    </Modal>
  )
}

export default CreateOrRenamePlaylistModal
