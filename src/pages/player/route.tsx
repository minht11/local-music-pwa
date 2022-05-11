import { RouteDefinition } from 'solid-app-router'
import { lazy } from 'solid-js'

const route: RouteDefinition = {
  path: '/player',
  component: lazy(() => import('./player')),
  children: [{ path: '/' }, { path: '/queue' }],
}

export default route
