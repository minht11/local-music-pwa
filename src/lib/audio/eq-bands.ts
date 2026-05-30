export const EQ_BANDS = [
	{ frequency: 32, label: '32 Hz' },
	{ frequency: 64, label: '64 Hz' },
	{ frequency: 125, label: '125 Hz' },
	{ frequency: 250, label: '250 Hz' },
	{ frequency: 500, label: '500 Hz' },
	{ frequency: 1000, label: '1 kHz' },
	{ frequency: 2000, label: '2 kHz' },
	{ frequency: 4000, label: '4 kHz' },
	{ frequency: 8000, label: '8 kHz' },
	{ frequency: 16_000, label: '16 kHz' },
] as const

export const EQ_MIN_GAIN = -12
export const EQ_MAX_GAIN = 12
