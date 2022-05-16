import { useMatch } from 'solid-app-router'
import { createMemo, JSXElement, ParentComponent, Show } from 'solid-js'
import { createMediaQuery } from '~/helpers/hooks/create-media-query'
import { ControlsPane } from './controls-pane/controls-pane'
import { QueueList } from './queue-list'
import { Scaffold } from '~/components/scaffold/scaffold'

const NowPlaying: ParentComponent = (props) => (
  <Scaffold title='Now Playing' topBar={false}>
    <ControlsPane pinned={Boolean(props.children)} />
    {props.children}
  </Scaffold>
)

const FullPlayerSeparatePages = () => {
  const mainPlayerMatch = useMatch(() => '/player')
  const isMainPlayer = createMemo(() => Boolean(mainPlayerMatch()))

  return (
    <Show when={!isMainPlayer()} fallback={<NowPlaying />}>
      <Scaffold title='Up next'>
        <QueueList />
      </Scaffold>
    </Show>
  )
}

const FullPlayer = (): JSXElement => {
  const isCompact = createMediaQuery('(max-width: 700px), (max-height: 640px)')

  return (
    <Show when={!isCompact()} fallback={<FullPlayerSeparatePages />}>
      <NowPlaying>
        <QueueList />
      </NowPlaying>
    </Show>
  )
}

export default FullPlayer
