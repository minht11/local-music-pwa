export const deleteIDBDatabases = async (
  baseName: string,
  latestVersion: number,
): Promise<void> => {
  const idb = window.indexedDB
  if ('databases' in idb) {
    const fullName = `${baseName}-${latestVersion}`

    const dbs = await idb.databases()
    dbs.forEach((db) => {
      if (db.name !== fullName) {
        idb.deleteDatabase(db.name)
      }
    })
  } else {
    // Firefox doesn't support idb.databases() yet.
    for (let i = 0; i < latestVersion; i += 1) {
      idb.deleteDatabase(`${baseName}-${i}`)
    }
  }
}
