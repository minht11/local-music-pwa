import { snackbar } from '$lib/components/snackbar/snackbar'
import { getDatabase } from '$lib/db/database'

export interface DirectoryNeedingPermission {
	name: string
	action: () => Promise<void>
}

export interface DirectoriesPermissionPromptSnackbarArg {
	dirs: () => DirectoryNeedingPermission[]
	dismiss: () => void
}

const dbGetDirectoriesNeedingPermission = async () => {
	const db = await getDatabase()
	const directories = await db.getAll('directories')

	const dirsWithPermissions = await Promise.all(
		directories.map(async (dir) => ({
			...dir,
			mode: await dir.handle.queryPermission({ mode: 'read' }),
		})),
	)

	return dirsWithPermissions.filter((d) => d.mode === 'prompt')
}

export const setupDirectoriesPermissionPrompt = async (
	snippet: Snippet<[DirectoriesPermissionPromptSnackbarArg]>,
): Promise<void> => {
	const dirsNeedingPermissionItems = await dbGetDirectoriesNeedingPermission()
	if (dirsNeedingPermissionItems.length === 0) {
		return
	}

	const snackbarId = 'dirs-needing-permission'

	const dismiss = () => snackbar.dismiss(snackbarId)

	let dirsNeedingPermission = $state(dirsNeedingPermissionItems)

	const dirsItems = $derived(
		dirsNeedingPermission.map(
			(dir): DirectoryNeedingPermission => ({
				name: dir.handle.name,
				action: async () => {
					const newMode = await dir.handle.requestPermission({ mode: 'read' })
					if (newMode === 'granted') {
						dirsNeedingPermission = dirsNeedingPermission.filter((d) => d.id !== dir.id)
					}

					if (dirsNeedingPermission.length === 0) {
						dismiss()
					}
				},
			}),
		),
	)

	const arg: DirectoriesPermissionPromptSnackbarArg = {
		dirs: () => dirsItems,
		dismiss,
	}

	snackbar({
		id: snackbarId,
		message: '',
		duration: false,
		layout: 'column',
		controls: {
			type: 'snippet',
			arg,
			snippet,
		},
	})
}
