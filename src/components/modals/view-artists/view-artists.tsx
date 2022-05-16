import { useNavigate } from 'solid-app-router'
import { For } from 'solid-js'
import { useEntitiesStore } from '../../../stores/stores'
import { List } from '../../list/list'
import { Modal } from '../../modal/modal'
import { InternalModalProps } from '../types'
import * as sharedStyles from '../../../styles/shared.css'

export interface ViewArtistsModalProps extends InternalModalProps {
  artistsIds: readonly string[]
}

const ViewArtistsModal = (props: ViewArtistsModalProps) => {
  const navigate = useNavigate()

  const [entities] = useEntitiesStore()
  const { artists } = entities

  const onItemClickHandler = (id: string) => {
    props.close()
    navigate(`/artist/${encodeURIComponent(id)}`)
  }

  return (
    <Modal
      title='View Artists'
      onConfirm={() => props.close()}
      onCancel={props.close}
    >
      <List>
        <For each={props.artistsIds}>
          {(id) => (
            <div
              class={sharedStyles.listItem}
              onClick={[onItemClickHandler, id]}
            >
              {artists[id].name}
            </div>
          )}
        </For>
      </List>
    </Modal>
  )
}

export default ViewArtistsModal
