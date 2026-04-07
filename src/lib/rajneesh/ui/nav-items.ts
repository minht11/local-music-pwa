import type { IconType } from '$lib/components/icon/Icon.svelte'
import * as m from '$paraglide/messages'

export interface NavItem {
    slug: string
    title: string
    icon: IconType
}

export const getNavItems = (): NavItem[] => {
    return [
        {
            slug: 'home',
            title: 'Home',
            icon: 'home',
        },
        {
            slug: 'shorts',
            title: 'Shorts',
            icon: 'musicNote',
        },
        {
            slug: 'explore',
            title: 'Explore',
            icon: 'compass',
        },
		{
			slug: 'bookmarks',
			title: 'Bookmarks',
			icon: 'bookmark',
		},
    ]
}
