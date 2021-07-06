import { useRouter } from '@rturnq/solid-router'
import { Component } from 'solid-js'
import { wait } from '../../utils'
import {
  IconButton,
  IconButtonProps,
  IconType,
} from '../icon-button/icon-button'

export const BackButton: Component<IconButtonProps> = (props) => {
  const router = useRouter()

  const onClickHandler = () => {
    const url = router.location.path
    window.history.back()
    // If there are no entries inside history back button
    // won't work and user will be stuck.
    // Example: user loads new tab going straight to /settings,
    // when app back button is pressed, nothing happens because
    // this is the first entry in history.
    // To prevent this check if URL changed, after short delay,
    // if it didn't back button most likely didn't do anything.
    wait(50).then(() => {
      if (url === router.location.path) {
        router.push('/')
      }
    })
  }

  return (
    <IconButton
      icon={IconType.BACK_ARROW}
      title='Back button'
      {...props}
      onClick={onClickHandler}
    />
  )
}
