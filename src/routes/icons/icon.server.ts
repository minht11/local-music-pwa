const foregroundColor = '#ffffff'

export const getAppIcon = (clipBounds = false): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24">
    ${
		clipBounds
			? `<defs>
                    <clipPath id="bounds">
                        <circle cx="12" cy="12" r="11.16" />
                    </clipPath>
                </defs>
            `
			: ''
	}
    
    <g ${clipBounds ? 'clip-path="url(#bounds)"' : ''}>
        <g id="foreground">
            <rect width="100%" height="100%" fill="#7c5800" />

            <rect width="2" height="10" fill="${foregroundColor}" x="13" y="6" rx="1" ry="1" />
            <rect width="6" height="4" fill="${foregroundColor}" x="9" y="13" rx="1" ry="1" />
        </g>
    </g>

    <style>
        @media (max-width: 40px) {
            #foreground {
                transform: scale(1.4);
                transform-origin:center;
            }
        }
    </style>
</svg>
`
