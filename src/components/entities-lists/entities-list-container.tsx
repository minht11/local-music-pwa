import { Component, JSX, Show } from 'solid-js'
import { pluralizeCount } from '../../utils'
import * as styles from './entities-list.css'

export interface BaseEntitiesListProps {
  items: readonly string[]
  count?: number
  hideSubheader?: boolean
  actions?: JSX.Element
  fallback?: JSX.Element
}

export interface EntitiesListContainerProps extends BaseEntitiesListProps {
  entityName: string
}

export const EntitiesListContainer: Component<EntitiesListContainerProps> = (
  props,
) => (
  <Show
    // TODO. Unneeded parentheses https://github.com/solidjs/solid/issues/509
    // prettier-ignore
    when={props.count || (props.items.length || !props.fallback)}
    fallback={props.fallback}
  >
    <section className={styles.entitiesListSection}>
      <Show when={!props.hideSubheader}>
        <header className={styles.subheader}>
          <h1 className={styles.heading}>
            {pluralizeCount(
              props.count ?? props.items.length,
              props.entityName,
            )}
          </h1>
          {props.actions}
        </header>
      </Show>

      {props.children}
    </section>
  </Show>
)
