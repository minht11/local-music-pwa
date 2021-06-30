import { Component } from 'solid-js'
import { TracksList } from '../../entities-lists/tracks-list/tracks-list'
import { AppScrollContainer } from '../../app-scroll-container/app-scroll-container'
import { usePlayerStore } from '../../../stores/stores'
import { MessageBanner } from '../../message-banner/message-banner'
import * as styles from './queue.css'

interface QueueProps {
  ref?: HTMLDivElement
  isCompact?: boolean
}

const EmptyMessageBanner = () => (
  <MessageBanner
    message='Your queue is empty.'
    button={{
      title: 'Play something from the library',
      href: '/',
    }}
  />
)

export const Queue: Component<QueueProps> = (props) => {
  const [playerState, playerActions] = usePlayerStore()

  const tracks = () => playerState.trackIds

  return (
    <AppScrollContainer
      ref={props.ref}
      classNames={{ container: props.isCompact && styles.queueContainer }}
      headerProps={
        props.isCompact && {
          title: 'Up next',
          className: styles.header,
        }
      }
    >
      <TracksList
        showIndex={true}
        items={tracks()}
        isPlayingItem={(_, index) => index === playerState.activeTrackIndex}
        onItemClick={(_, index) => playerActions.playTrack(index)}
        fallback={EmptyMessageBanner}
      />
    </AppScrollContainer>
  )
}
