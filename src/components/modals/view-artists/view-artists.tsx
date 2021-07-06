import { useRouter } from '@rturnq/solid-router'
import { Component, For } from 'solid-js'
import { useEntitiesStore } from '../../../stores/stores'
import { IconType } from '../../icon/icon-paths'
import { List } from '../../list/list'
import { Modal } from '../../modal/modal'
import { InternalModalProps } from '../types'
import * as sharedStyles from '../../../styles/shared.css'

interface ViewArtistsModalProps extends InternalModalProps {
  artistsIds: string[]
}

export const ViewArtistsModal: Component<ViewArtistsModalProps> = (props) => {
  const router = useRouter()

  const [entities] = useEntitiesStore()
  const { artists } = entities

  const onItemClickHandler = (id: string) => {
    props.close()
    router.push(`/artists/${id}`)
  }

  return (
    <Modal
      titleIcon={IconType.PERSON}
      title='View Artists'
      onConfirm={() => props.close()}
      onCancel={props.close}
    >
      <List>
        <For each={props.artistsIds}>
          {(id) => (
            <div
              className={sharedStyles.listItem}
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
