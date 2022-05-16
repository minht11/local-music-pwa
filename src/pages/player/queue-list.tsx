import { JSXElement } from 'solid-js'
import { usePlayerStore } from '~/stores/stores'
import { TracksList } from '~/components/entities-lists/tracks-list/tracks-list'
import { MessageBanner } from '~/components/message-banner/message-banner'
import { ScrollContainer } from '~/components/scroll-container/scroll-container'

export const QueueList = (): JSXElement => {
  const [playerState, playerActions] = usePlayerStore()

  return (
    <ScrollContainer observeScrollState>
      <TracksList
        showIndex
        items={playerState.trackIds}
        isPlayingItem={(_, index) => index === playerState.activeTrackIndex}
        onItemClick={(_, index) => playerActions.playTrack(index)}
        fallback={
          <MessageBanner
            message='Your queue is empty.'
            button={{
              title: 'Play something from the library',
              href: '/',
            }}
          />
        }
      />
    </ScrollContainer>
  )
}
