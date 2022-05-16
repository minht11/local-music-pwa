import { createEffect, JSXElement } from 'solid-js'
import { useNavigate } from 'solid-app-router'
import { IconButton } from '~/components/icon-button/icon-button'
import { debounce, doesElementContainFocus } from '~/utils'
import { AppTopBar } from '~/components/app-top-bar/app-top-bar'
import * as styles from './search-header.css'

export interface SearchHeaderProps {
  searchTerm: string
}

export const SearchHeader = (props: SearchHeaderProps): JSXElement => {
  const navigate = useNavigate()

  let inputEl!: HTMLInputElement

  const replaceSearchRoute = (value: string) => {
    navigate(`/search/${encodeURIComponent(value)}`, {
      replace: true,
    })
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
    <AppTopBar hideSpacer>
      <div class={styles.searchBox}>
        <input
          class={styles.searchInput}
          aria-label='Search box'
          placeholder='Search...'
          autocapitalize='none'
          onInput={onSearchHandle}
          ref={inputEl}
        />
        {props.searchTerm && (
          <IconButton icon='close' onClick={onClearSearchHandle} />
        )}
      </div>
      <div class={styles.symmetrySpacer}></div>
    </AppTopBar>
  )
}
