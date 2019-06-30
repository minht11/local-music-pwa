import localforage from 'localforage'

export class CacheStorage {
  private localforage: typeof localforage

  constructor(name: string) {
    this.localforage = localforage.createInstance({
      name,
    })
  }

  set(key: string, value: unknown) {
    return this.localforage.setItem(key, value)
  }

  get(key: string) {
    return this.localforage.getItem(key)
  }

  remove(key: string) {
    return this.localforage.removeItem(key)
  }

  clear() {
    return this.localforage.clear()
  }
}
