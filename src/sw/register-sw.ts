// https://whatwebcando.today/articles/handling-service-worker-updates/
import swURL from 'service-worker:./sw'

const waitForPageToLoad = async () => {
  if (document.readyState === 'loading') {
    return new Promise((resolve) => {
      window.addEventListener('load', resolve, { once: true })
    })
  }
  return Promise.resolve()
}

export interface Options {
  onNeedRefresh: (updateSw: () => void) => void
}

export const registerServiceWorker = async (options: Options) => {
  await waitForPageToLoad()

  const { serviceWorker } = navigator
  const registration = await serviceWorker.register(swURL, {
    scope: '/',
  })

  const needsRefresh = (reg: ServiceWorkerRegistration) => {
    const updateSw = () => {
      const { waiting } = reg
      if (waiting) {
        waiting.postMessage('skip-waiting')
      }
    }

    options.onNeedRefresh(updateSw)
  }

  // ensure the case when the updatefound event was missed is also handled
  // by re-invoking the prompt when there's a waiting Service Worker
  if (registration.waiting) {
    needsRefresh(registration)
  }

  registration.addEventListener('updatefound', () => {
    const { installing } = registration
    if (!installing) {
      return
    }

    // wait until the new Service worker is actually installed (ready to take over)
    installing.addEventListener('statechange', () => {
      // if there's an existing controller (previous Service Worker), show the prompt
      if (registration.waiting && navigator.serviceWorker.controller) {
        needsRefresh(registration)
      }
    })
  })

  let refreshing = false
  // detect controller change and refresh the page
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload()
      refreshing = true
    }
  })
}
