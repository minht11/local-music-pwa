import { Component, createEffect } from 'solid-js'
import { useRouter } from '@rturnq/solid-router'
import { IconButton } from '../../icon-button/icon-button'
import { IconType } from '../../icon/icon'
import { debounce, doesElementContainFocus } from '../../../utils'
import { Toolbar } from '../../toolbar/toolbar'
import * as styles from './search-header.css'

interface SearchHeaderProps {
  searchTerm: string
}

export const SearchHeader: Component<SearchHeaderProps> = (props) => {
  const router = useRouter()

  let inputEl!: HTMLInputElement

  const replaceSearchRoute = (value: string) => {
    // '/search/:searchTerm/optionalSubPath'.split('/') ->
    // ['', 'search', ':searchTerm', 'optionalSubPath']
    const endPath = router.location.path
      .split('/')
      .splice(3, Infinity)
      .join('/')
    const endPathOptional = endPath ? `/${endPath}` : ''

    router.replace(`/search/${encodeURIComponent(value)}${endPathOptional}`)
  }

  const onSearchHandle = debounce(() => {
    const value = inputEl.value.trim()
    replaceSearchRoute(value)
  }, 200)

  const onClearSearchHandle = () => {
    replaceSearchRoute('')
  }

  createEffect(() => {
    if (!inputEl) {
      return
    }

    const term = props.searchTerm
    // Updating url with new value causes a race condition,
    // so only change input value when it is not focused.
    if (!doesElementContainFocus(inputEl) || term === '') {
      inputEl.value = term
    }
  })

  return (
    <Toolbar hideSpacer={true}>
      <div className={styles.searchBox}>
        <input
          className={styles.searchInput}
          aria-label='Search box'
          placeholder='Search...'
          autocapitalize='none'
          onInput={onSearchHandle}
          ref={inputEl}
        />
        <IconButton icon={IconType.CLOSE} onClick={onClearSearchHandle} />
      </div>
      <div className={styles.symmetrySpacer}></div>
    </Toolbar>
  )
}
