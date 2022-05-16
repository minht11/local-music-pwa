import { JSXElement } from 'solid-js'
import { MessageBanner } from '~/components/message-banner/message-banner'
import { Scaffold } from '~/components/scaffold/scaffold'

const NotFound = (): JSXElement => (
  <Scaffold title='Not found' topBar={false}>
    <MessageBanner
      title='Nothing here :('
      message='Page you were looking for was not found'
      button={{ href: '/', title: 'Go Home' }}
    />
  </Scaffold>
)

export default NotFound
