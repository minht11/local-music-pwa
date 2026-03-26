#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TRANSCRIPTS_DIR = path.join(ROOT, 'static', 'rajneesh', 'transcripts')
const ANALYSIS_OUTPUT_PATH = path.join(ROOT, 'generated', 'transcript-tags.analysis.json')
const DISCOVER_OUTPUT_PATH = path.join(ROOT, 'static', 'rajneesh', 'discover-tags.json')
const HOME_PAGE_PATH = path.join(ROOT, 'src', 'lib', 'rajneesh', 'pages', 'home', 'Home.svelte')

type TagDefinition = {
	tag: string
	variants: string[]
}

type TranscriptTag = {
	tag: string
	score: number
	hits: number
	matchedVariants: string[]
}

type TranscriptResult = {
	seriesSlug: string
	discourseSlug: string
	relativePath: string
	tags: TranscriptTag[]
}

type GlobalTag = {
	tag: string
	documents: number
	hits: number
	maxScore: number
	matchedVariants: string[]
}

type DiscoverTagEntry = [tag: string, documents: number, hits: number]

const RAW_TAG_DEFINITIONS: TagDefinition[] = [
	{ tag: 'à¤¸à¥à¤¤à¥à¤°à¥€', variants: ['à¤¸à¥à¤¤à¥à¤°à¥€', 'à¤¸à¥à¤¤à¥à¤°à¤¿à¤¯à¤¾à¤', 'à¤¨à¤¾à¤°à¥€', 'à¤®à¤¹à¤¿à¤²à¤¾', 'à¤”à¤°à¤¤', 'à¤¨à¤¾à¤°à¤¿à¤¤à¥à¤µ'] },
	{ tag: 'à¤ªà¥à¤°à¥à¤·', variants: ['à¤ªà¥à¤°à¥à¤·', 'à¤ªà¥à¤°à¥à¤·à¥‹à¤‚', 'à¤®à¤°à¥à¤¦', 'à¤¨à¤°', 'à¤ªà¥Œà¤°à¥à¤·'] },
	{ tag: 'à¤¬à¥à¤¦à¥à¤§', variants: ['à¤¬à¥à¤¦à¥à¤§', 'à¤—à¥Œà¤¤à¤® à¤¬à¥à¤¦à¥à¤§', 'à¤¤à¤¥à¤¾à¤—à¤¤'] },
	{ tag: 'à¤ªà¤¤à¤‚à¤œà¤²à¤¿', variants: ['à¤ªà¤¤à¤‚à¤œà¤²à¤¿'] },
	{ tag: 'à¤—à¥‹à¤°à¤–', variants: ['à¤—à¥‹à¤°à¤–', 'à¤—à¥‹à¤°à¤–à¤¨à¤¾à¤¥'] },
	{ tag: 'à¤•à¥ƒà¤·à¥à¤£', variants: ['à¤•à¥ƒà¤·à¥à¤£', 'à¤¶à¥à¤°à¥€à¤•à¥ƒà¤·à¥à¤£'] },
	{ tag: 'à¤•à¤¬à¥€à¤°', variants: ['à¤•à¤¬à¥€à¤°'] },
	{ tag: 'à¤®à¤¹à¤¾à¤µà¥€à¤°', variants: ['à¤®à¤¹à¤¾à¤µà¥€à¤°', 'à¤µà¤°à¥à¤§à¤®à¤¾à¤¨'] },
	{ tag: 'à¤²à¤¾à¤“à¤¤à¥à¤¸à¥‡', variants: ['à¤²à¤¾à¤“à¤¤à¥à¤¸à¥‡', 'à¤²à¤¾à¤“ à¤¤à¥à¤¸à¥', 'à¤²à¤¾à¤“à¤¤à¥à¤¸à¥'] },
	{ tag: 'à¤®à¥€à¤°à¤¾', variants: ['à¤®à¥€à¤°à¤¾', 'à¤®à¥€à¤°à¤¾à¤¬à¤¾à¤ˆ'] },
	{ tag: 'à¤¨à¤¾à¤¨à¤•', variants: ['à¤¨à¤¾à¤¨à¤•', 'à¤—à¥à¤°à¥à¤¨à¤¾à¤¨à¤•', 'à¤—à¥à¤°à¥ à¤¨à¤¾à¤¨à¤•'] },
	{ tag: 'à¤‰à¤ªà¤¨à¤¿à¤·à¤¦', variants: ['à¤‰à¤ªà¤¨à¤¿à¤·à¤¦', 'à¤‰à¤ªà¤¨à¤¿à¤·à¤¦à¥', 'à¤‰à¤ªà¤¨à¤¿à¤·à¤¦à¥‹à¤‚'] },
	{ tag: 'à¤—à¥€à¤¤à¤¾', variants: ['à¤—à¥€à¤¤à¤¾', 'à¤­à¤—à¤µà¤¦à¥à¤—à¥€à¤¤à¤¾', 'à¤­à¤—à¤µà¤¦à¥ à¤—à¥€à¤¤à¤¾'] },
	{ tag: 'à¤¯à¥‹à¤—', variants: ['à¤¯à¥‹à¤—', 'à¤¯à¥‹à¤—à¥€', 'à¤¯à¥‹à¤—à¤¿à¤¯à¥‹à¤‚', 'à¤¯à¥‹à¤—à¤¸à¥‚à¤¤à¥à¤°', 'à¤¯à¥‹à¤— à¤¸à¥‚à¤¤à¥à¤°'] },
	{ tag: 'à¤¤à¤‚à¤¤à¥à¤°', variants: ['à¤¤à¤‚à¤¤à¥à¤°', 'à¤¤à¤¾à¤‚à¤¤à¥à¤°à¤¿à¤•'] },
	{ tag: 'à¤§à¥à¤¯à¤¾à¤¨', variants: ['à¤§à¥à¤¯à¤¾à¤¨', 'à¤§à¥à¤¯à¤¾à¤¨à¥€'] },
	{ tag: 'à¤¸à¤®à¤¾à¤§à¤¿', variants: ['à¤¸à¤®à¤¾à¤§à¤¿', 'à¤¸à¤¹à¤œ à¤¸à¤®à¤¾à¤§à¤¿'] },
	{ tag: 'à¤ªà¥à¤°à¤¾à¤°à¥à¤¥à¤¨à¤¾', variants: ['à¤ªà¥à¤°à¤¾à¤°à¥à¤¥à¤¨à¤¾', 'à¤ªà¥à¤°à¤¾à¤°à¥à¤¥à¤¨à¤¾à¤ªà¥‚à¤°à¥à¤£'] },
	{ tag: 'à¤®à¥Œà¤¨', variants: ['à¤®à¥Œà¤¨', 'à¤šà¥à¤ªà¥à¤ªà¥€', 'à¤¨à¤¿à¤ƒà¤¶à¤¬à¥à¤¦'] },
	{ tag: 'à¤¶à¥‚à¤¨à¥à¤¯', variants: ['à¤¶à¥‚à¤¨à¥à¤¯', 'à¤¶à¥‚à¤¨à¥à¤¯à¤¤à¤¾'] },
	{ tag: 'à¤†à¤¤à¥à¤®à¤¾', variants: ['à¤†à¤¤à¥à¤®à¤¾', 'à¤†à¤¤à¥à¤®à¤¨à¥', 'à¤†à¤¤à¥à¤®à¤¨'] },
	{ tag: 'à¤ªà¤°à¤®à¤¾à¤¤à¥à¤®à¤¾', variants: ['à¤ªà¤°à¤®à¤¾à¤¤à¥à¤®à¤¾', 'à¤ˆà¤¶à¥à¤µà¤°', 'à¤­à¤—à¤µà¤¾à¤¨'] },
	{ tag: 'à¤¸à¤¤à¥à¤¯', variants: ['à¤¸à¤¤à¥à¤¯', 'à¤¸à¤šà¥à¤šà¤¾à¤ˆ'] },
	{ tag: 'à¤§à¤°à¥à¤®', variants: ['à¤§à¤°à¥à¤®', 'à¤§à¤®à¥à¤®', 'à¤§à¤¾à¤°à¥à¤®à¤¿à¤•'] },
	{ tag: 'à¤…à¤¹à¤‚à¤•à¤¾à¤°', variants: ['à¤…à¤¹à¤‚à¤•à¤¾à¤°', 'à¤…à¤¹à¤‚'] },
	{ tag: 'à¤ªà¥à¤°à¥‡à¤®', variants: ['à¤ªà¥à¤°à¥‡à¤®', 'à¤ªà¥à¤¯à¤¾à¤°', 'à¤®à¥‹à¤¹à¤¬à¥à¤¬à¤¤'] },
	{ tag: 'à¤•à¤°à¥à¤£à¤¾', variants: ['à¤•à¤°à¥à¤£à¤¾', 'à¤¦à¤¯à¤¾à¤²à¥', 'à¤¦à¤¯à¤¾'] },
	{ tag: 'à¤­à¤•à¥à¤¤à¤¿', variants: ['à¤­à¤•à¥à¤¤à¤¿', 'à¤­à¤•à¥à¤¤', 'à¤­à¤œà¤¨'] },
	{ tag: 'à¤†à¤¨à¤‚à¤¦', variants: ['à¤†à¤¨à¤‚à¤¦', 'à¤†à¤¨à¤¨à¥à¤¦'] },
	{ tag: 'à¤¶à¤¾à¤‚à¤¤à¤¿', variants: ['à¤¶à¤¾à¤‚à¤¤à¤¿', 'à¤¶à¤¾à¤¨à¥à¤¤à¤¿'] },
	{ tag: 'à¤®à¥ƒà¤¤à¥à¤¯à¥', variants: ['à¤®à¥ƒà¤¤à¥à¤¯à¥', 'à¤®à¥Œà¤¤', 'à¤®à¤°à¤¨à¤¾'] },
	{ tag: 'à¤œà¥€à¤µà¤¨', variants: ['à¤œà¥€à¤µà¤¨', 'à¤œà¤¿à¤‚à¤¦à¤—à¥€', 'à¤œà¤¿à¤¨à¥à¤¦à¤—à¥€'] },
	{ tag: 'à¤®à¤¨', variants: ['à¤®à¤¨', 'à¤®à¤¨à¥‹', 'à¤®à¤¸à¥à¤¤à¤¿à¤·à¥à¤•'] },
	{ tag: 'à¤šà¤¿à¤¤à¥à¤¤', variants: ['à¤šà¤¿à¤¤à¥à¤¤'] },
	{ tag: 'à¤¬à¥à¤¦à¥à¤§à¤¿', variants: ['à¤¬à¥à¤¦à¥à¤§à¤¿', 'à¤¬à¥Œà¤¦à¥à¤§à¤¿à¤•', 'à¤¬à¥à¤¦à¥à¤§à¤¿à¤µà¤¾à¤¦à¥€'] },
	{ tag: 'à¤¹à¥ƒà¤¦à¤¯', variants: ['à¤¹à¥ƒà¤¦à¤¯', 'à¤¦à¤¿à¤²'] },
	{ tag: 'à¤¶à¤¿à¤•à¥à¤·à¤¾', variants: ['à¤¶à¤¿à¤•à¥à¤·à¤¾', 'à¤¶à¤¿à¤•à¥à¤·à¤¿à¤¤', 'à¤µà¤¿à¤¦à¥à¤¯à¤¾'] },
	{ tag: 'à¤µà¤¿à¤œà¥à¤žà¤¾à¤¨', variants: ['à¤µà¤¿à¤œà¥à¤žà¤¾à¤¨', 'à¤µà¥ˆà¤œà¥à¤žà¤¾à¤¨à¤¿à¤•'] },
	{ tag: 'à¤¸à¤®à¤¾à¤œ', variants: ['à¤¸à¤®à¤¾à¤œ', 'à¤¸à¤¾à¤®à¤¾à¤œà¤¿à¤•'] },
	{ tag: 'à¤°à¤¾à¤œà¤¨à¥€à¤¤à¤¿', variants: ['à¤°à¤¾à¤œà¤¨à¥€à¤¤à¤¿', 'à¤°à¤¾à¤œà¤¨à¥€à¤¤à¤¿à¤•', 'à¤°à¤¾à¤œà¤¨à¥‡à¤¤à¤¾'] },
	{ tag: 'à¤•à¥à¤°à¤¾à¤‚à¤¤à¤¿', variants: ['à¤•à¥à¤°à¤¾à¤‚à¤¤à¤¿', 'à¤•à¥à¤°à¤¾à¤¨à¥à¤¤à¤¿', 'à¤•à¥à¤°à¤¾à¤‚à¤¤à¤¿à¤•à¤¾à¤°à¥€'] },
	{ tag: 'à¤µà¤¿à¤µà¤¾à¤¹', variants: ['à¤µà¤¿à¤µà¤¾à¤¹', 'à¤¶à¤¾à¤¦à¥€', 'à¤¦à¤¾à¤®à¥à¤ªà¤¤à¥à¤¯'] },
	{ tag: 'à¤ªà¤°à¤¿à¤µà¤¾à¤°', variants: ['à¤ªà¤°à¤¿à¤µà¤¾à¤°', 'à¤˜à¤°', 'à¤—à¥ƒà¤¹à¤¸à¥à¤¥'] },
	{ tag: 'à¤®à¤¾à¤', variants: ['à¤®à¤¾à¤', 'à¤®à¤¾à¤¤à¤¾', 'à¤®à¤¾à¤¤à¤¾à¤à¤‚', 'à¤®à¤¾à¤¤à¤¾à¤à¤'] },
	{ tag: 'à¤ªà¤¿à¤¤à¤¾', variants: ['à¤ªà¤¿à¤¤à¤¾', 'à¤¬à¤¾à¤ª', 'à¤ªà¤¿à¤¤à¤¾à¤œà¥€'] },
	{ tag: 'à¤¸à¥‡à¤•à¥à¤¸', variants: ['à¤¸à¥‡à¤•à¥à¤¸', 'à¤•à¤¾à¤®', 'à¤•à¤¾à¤®à¤µà¤¾à¤¸à¤¨à¤¾', 'à¤•à¤¾à¤®à¤¨à¤¾'] },
	{ tag: 'à¤µà¤¾à¤¸à¤¨à¤¾', variants: ['à¤µà¤¾à¤¸à¤¨à¤¾', 'à¤¤à¥ƒà¤·à¥à¤£à¤¾'] },
	{ tag: 'à¤²à¥‹à¤­', variants: ['à¤²à¥‹à¤­', 'à¤²à¤¾à¤²à¤š'] },
	{ tag: 'à¤•à¥à¤°à¥‹à¤§', variants: ['à¤•à¥à¤°à¥‹à¤§', 'à¤—à¥à¤¸à¥à¤¸à¤¾'] },
	{ tag: 'à¤®à¥‹à¤¹', variants: ['à¤®à¥‹à¤¹', 'à¤®à¤¾à¤¯à¤¾', 'à¤†à¤¸à¤•à¥à¤¤à¤¿'] },
	{ tag: 'à¤¸à¤¨à¥à¤¨à¥à¤¯à¤¾à¤¸', variants: ['à¤¸à¤‚à¤¨à¥à¤¯à¤¾à¤¸', 'à¤¸à¤¨à¥à¤¨à¥à¤¯à¤¾à¤¸', 'à¤¸à¤‚à¤¨à¥à¤¯à¤¾à¤¸à¥€', 'à¤¸à¤¨à¥à¤¨à¥à¤¯à¤¾à¤¸à¥€'] },
	{ tag: 'à¤—à¥à¤°à¥', variants: ['à¤—à¥à¤°à¥', 'à¤¸à¤¦à¤—à¥à¤°à¥'] },
	{ tag: 'à¤¶à¤¿à¤·à¥à¤¯', variants: ['à¤¶à¤¿à¤·à¥à¤¯', 'à¤šà¥‡à¤²à¤¾', 'à¤¸à¤¾à¤§à¤•'] },
	{ tag: 'à¤¸à¤¾à¤§à¤¨à¤¾', variants: ['à¤¸à¤¾à¤§à¤¨à¤¾', 'à¤¸à¤¾à¤§à¤•', 'à¤¸à¤¾à¤§à¥'] },
	{ tag: 'à¤ªà¥à¤°à¤¾à¤£', variants: ['à¤ªà¥à¤°à¤¾à¤£', 'à¤¶à¥à¤µà¤¾à¤¸', 'à¤¸à¤¾à¤‚à¤¸', 'à¤¸à¤¾à¤à¤¸'] },
	{ tag: 'à¤•à¥à¤‚à¤¡à¤²à¤¿à¤¨à¥€', variants: ['à¤•à¥à¤‚à¤¡à¤²à¤¿à¤¨à¥€', 'à¤•à¥à¤£à¥à¤¡à¤²à¤¿à¤¨à¥€'] },
	{ tag: 'à¤®à¥à¤•à¥à¤¤à¤¿', variants: ['à¤®à¥à¤•à¥à¤¤à¤¿', 'à¤®à¥‹à¤•à¥à¤·', 'à¤¨à¤¿à¤°à¥à¤µà¤¾à¤£'] },
	{ tag: 'à¤¸à¥à¤µà¤¤à¤‚à¤¤à¥à¤°à¤¤à¤¾', variants: ['à¤¸à¥à¤µà¤¤à¤‚à¤¤à¥à¤°à¤¤à¤¾', 'à¤¸à¥à¤µà¤¾à¤§à¥€à¤¨à¤¤à¤¾', 'à¤†à¤œà¤¼à¤¾à¤¦à¥€', 'à¤†à¤œà¤¾à¤¦à¥€'] },
	{ tag: 'à¤­à¤¯', variants: ['à¤­à¤¯', 'à¤¡à¤°'] },
	{ tag: 'à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸', variants: ['à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸', 'à¤¶à¥à¤°à¤¦à¥à¤§à¤¾', 'à¤†à¤¸à¥à¤¥à¤¾', 'à¤­à¤°à¥‹à¤¸à¤¾'] },
	{ tag: 'à¤¸à¤‚à¤¦à¥‡à¤¹', variants: ['à¤¸à¤‚à¤¦à¥‡à¤¹', 'à¤¶à¤‚à¤•à¤¾', 'à¤¡à¤¾à¤‰à¤Ÿ'] },
	{ tag: 'à¤ªà¥à¤°à¤¶à¥à¤¨', variants: ['à¤ªà¥à¤°à¤¶à¥à¤¨', 'à¤¸à¤µà¤¾à¤²'] },
	{ tag: 'à¤–à¥‹à¤œ', variants: ['à¤–à¥‹à¤œ', 'à¤¤à¤²à¤¾à¤¶'] },
	{ tag: 'à¤¸à¤¤à¥à¤¯à¤¾à¤—à¥à¤°à¤¹', variants: ['à¤¸à¤¤à¥à¤¯à¤¾à¤—à¥à¤°à¤¹'] },
	{ tag: 'à¤­à¤¾à¤°à¤¤', variants: ['à¤­à¤¾à¤°à¤¤', 'à¤­à¤¾à¤°à¤¤à¥€à¤¯', 'à¤¹à¤¿à¤‚à¤¦à¥à¤¸à¥à¤¤à¤¾à¤¨', 'à¤¹à¤¿à¤¨à¥à¤¦à¥à¤¸à¥à¤¤à¤¾à¤¨'] },
	{ tag: 'à¤®à¤‚à¤¦à¤¿à¤°', variants: ['à¤®à¤‚à¤¦à¤¿à¤°', 'à¤®à¤¨à¥à¤¦à¤¿à¤°'] },
	{ tag: 'à¤°à¤¾à¤®', variants: ['à¤°à¤¾à¤®', 'à¤°à¤¾à¤®à¤¨à¤¾à¤®'] },
	{ tag: 'à¤•à¥ƒà¤·à¤¿', variants: ['à¤•à¥ƒà¤·à¤¿', 'à¤–à¥‡à¤¤à¥€', 'à¤•à¤¿à¤¸à¤¾à¤¨'] },
	{ tag: 'à¤§à¤¨', variants: ['à¤§à¤¨', 'à¤ªà¥ˆà¤¸à¤¾', 'à¤¸à¤®à¥à¤ªà¤¤à¥à¤¤à¤¿', 'à¤¸à¤‚à¤ªà¤¤à¥à¤¤à¤¿'] },
	{ tag: 'à¤­à¥‹à¤—', variants: ['à¤­à¥‹à¤—', 'à¤‰à¤ªà¤­à¥‹à¤—'] },
	{ tag: 'à¤¤à¥à¤¯à¤¾à¤—', variants: ['à¤¤à¥à¤¯à¤¾à¤—', 'à¤¤à¥à¤¯à¤¾à¤—à¥€'] },
	{ tag: 'à¤¸à¤¾à¤•à¥à¤·à¥€', variants: ['à¤¸à¤¾à¤•à¥à¤·à¥€', 'à¤¸à¤¾à¤•à¥à¤·à¥€à¤­à¤¾à¤µ'] },
	{ tag: 'à¤šà¥‡à¤¤à¤¨à¤¾', variants: ['à¤šà¥‡à¤¤à¤¨à¤¾', 'à¤šà¥ˆà¤¤à¤¨à¥à¤¯', 'à¤¹à¥‹à¤¶'] },
	{ tag: 'à¤¸à¤®à¤°à¥à¤ªà¤£', variants: ['à¤¸à¤®à¤°à¥à¤ªà¤£', 'à¤¸à¤®à¤°à¥à¤ªà¤¿à¤¤'] },
	{ tag: 'à¤¤à¤¾à“', variants: ['à¤¤à¤¾à“', 'à¤¤à¤¾à“à¤µà¤¾à¤¦'] },
	{ tag: 'à¤¸à¥‚à¤¤à¥à¤°', variants: ['à¤¸à¥‚à¤¤à¥à¤°', 'à¤¸à¥‚à¤¤à¥à¤°à¥‹à¤‚'] },
]

const DISCOVER_STOP_TAGS = new Set(
	[
		'\u092e\u0928',
		'\u091a\u093f\u0924\u094d\u0924',
		'\u092a\u094d\u0930\u0936\u094d\u0928',
		'\u0916\u094b\u091c',
		'\u0938\u0942\u0924\u094d\u0930',
		'\u0938\u092e\u093e\u091c',
		'\u0939\u0943\u0926\u092f',
		'\u0906\u0924\u094d\u092e\u093e',
		'\u092a\u0930\u092e\u093e\u0924\u094d\u092e\u093e',
		'\u0938\u0902\u0926\u0947\u0939',
		'\u0935\u093f\u0936\u094d\u0935\u093e\u0938',
		'\u0927\u0928',
		'\u092e\u093e\u0901',
		'\u092a\u093f\u0924\u093e',
	],
)

const LETTER_OR_MARK = String.raw`[\p{L}\p{M}]`
const MOJIBAKE_HINT = /(?:\u00e0\u00a4|\u00e0\u00a5|\u00c3|\u00c2)/u

function* walkTranscripts(dir: string): Generator<{ seriesSlug: string; discourseSlug: string; filePath: string }> {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue
		const seriesSlug = entry.name
		const seriesPath = path.join(dir, entry.name)
		for (const subEntry of fs.readdirSync(seriesPath, { withFileTypes: true })) {
			if (!subEntry.isFile() || !subEntry.name.endsWith('.txt')) continue
			const discourseSlug = subEntry.name.slice(0, -4)
			yield {
				seriesSlug,
				discourseSlug,
				filePath: path.join(seriesPath, subEntry.name),
			}
		}
	}
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodePossiblyMojibake(text: string): string {
	if (!MOJIBAKE_HINT.test(text)) {
		return text
	}

	const repaired = Buffer.from(text, 'latin1').toString('utf8')
	const repairedDevanagariCount = (repaired.match(/[\u0900-\u097F]/g) ?? []).length
	const originalDevanagariCount = (text.match(/[\u0900-\u097F]/g) ?? []).length

	return repairedDevanagariCount > originalDevanagariCount ? repaired : text
}

function normalizeText(text: string): string {
	return decodePossiblyMojibake(text).normalize('NFC').replace(/\r\n?/g, '\n')
}

function extractConstArray(source: string, constName: string): string[] {
	const pattern = new RegExp(`const ${constName} = \\[((?:.|\\r|\\n)*?)\\] as const`)
	const match = source.match(pattern)
	if (!match) {
		return []
	}

	return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => decodePossiblyMojibake(entry[1]))
}

const TAG_DEFINITIONS: TagDefinition[] = RAW_TAG_DEFINITIONS.map((definition) => ({
	tag: decodePossiblyMojibake(definition.tag),
	variants: definition.variants.map((variant) => decodePossiblyMojibake(variant)),
}))

const homePageSource = fs.readFileSync(HOME_PAGE_PATH, 'utf8')
const DISCOVER_TOPIC_CATALOG = extractConstArray(homePageSource, 'DISCOVER_TOPICS')
const HOME_DISCOVER_PRIORITY_TAGS = extractConstArray(homePageSource, 'DISCOVER_TOPIC_PRIORITY')

function countVariantOccurrences(text: string, variant: string): number {
	const pattern = new RegExp(`(?<!${LETTER_OR_MARK})${escapeRegex(variant)}(?!${LETTER_OR_MARK})`, 'gu')
	return [...text.matchAll(pattern)].length
}

function scoreTranscript(text: string): TranscriptTag[] {
	const matches: TranscriptTag[] = []

	for (const definition of TAG_DEFINITIONS) {
		let hits = 0
		const matchedVariants: string[] = []
		for (const variant of definition.variants) {
			const variantHits = countVariantOccurrences(text, variant)
			if (variantHits > 0) {
				hits += variantHits
				matchedVariants.push(variant)
			}
		}
		if (hits === 0) continue

		const score = hits + matchedVariants.length * 0.35
		matches.push({
			tag: definition.tag,
			score: Number(score.toFixed(2)),
			hits,
			matchedVariants,
		})
	}

	return matches
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score
			if (b.hits !== a.hits) return b.hits - a.hits
			return a.tag.localeCompare(b.tag, 'hi')
		})
		.slice(0, 12)
}

function buildGlobalTags(transcriptResults: TranscriptResult[]): GlobalTag[] {
	const globalStats = new Map<
		string,
		{ documents: number; hits: number; maxScore: number; variants: Set<string> }
	>()

	for (const transcript of transcriptResults) {
		for (const tag of transcript.tags) {
			const existing = globalStats.get(tag.tag) ?? {
				documents: 0,
				hits: 0,
				maxScore: 0,
				variants: new Set<string>(),
			}
			existing.documents += 1
			existing.hits += tag.hits
			existing.maxScore = Math.max(existing.maxScore, tag.score)
			for (const variant of tag.matchedVariants) {
				existing.variants.add(variant)
			}
			globalStats.set(tag.tag, existing)
		}
	}

	return [...globalStats.entries()]
		.map(([tag, stats]) => ({
			tag,
			documents: stats.documents,
			hits: stats.hits,
			maxScore: Number(stats.maxScore.toFixed(2)),
			matchedVariants: [...stats.variants].sort((a, b) => a.localeCompare(b, 'hi')),
		}))
		.sort((a, b) => {
			if (b.documents !== a.documents) return b.documents - a.documents
			if (b.hits !== a.hits) return b.hits - a.hits
			return a.tag.localeCompare(b.tag, 'hi')
		})
}

function buildDiscoverPayload(texts: string[]) {
	const priorityIndex = new Map(HOME_DISCOVER_PRIORITY_TAGS.map((tag, index) => [tag, index]))
	const discoverStats = new Map<string, { documents: number; hits: number }>()

	for (const tag of DISCOVER_TOPIC_CATALOG) {
		let documents = 0
		let hits = 0
		for (const text of texts) {
			const tagHits = countVariantOccurrences(text, tag)
			if (tagHits === 0) continue
			documents += 1
			hits += tagHits
		}

		if (documents === 0 || DISCOVER_STOP_TAGS.has(tag)) {
			continue
		}

		discoverStats.set(tag, { documents, hits })
	}

	const tags: DiscoverTagEntry[] = [...discoverStats.entries()]
		.map(([tag, stats]) => [tag, stats.documents, stats.hits] as DiscoverTagEntry)
		.sort((a, b) => {
			const aPriority = priorityIndex.get(a[0])
			const bPriority = priorityIndex.get(b[0])
			if (aPriority !== undefined || bPriority !== undefined) {
				if (aPriority === undefined) return 1
				if (bPriority === undefined) return -1
				return aPriority - bPriority
			}
			if (b[1] !== a[1]) return b[1] - a[1]
			if (b[2] !== a[2]) return b[2] - a[2]
			return a[0].localeCompare(b[0], 'hi')
		})

	return {
		v: 1,
		tags,
	}
}

function main() {
	const transcriptResults: TranscriptResult[] = []
	const transcriptTexts: string[] = []
	let processedFiles = 0

	for (const item of walkTranscripts(TRANSCRIPTS_DIR)) {
		const raw = fs.readFileSync(item.filePath, 'utf8')
		const text = normalizeText(raw)
		transcriptTexts.push(text)
		const tags = scoreTranscript(text)
		if (tags.length === 0) continue

		processedFiles++
		transcriptResults.push({
			seriesSlug: item.seriesSlug,
			discourseSlug: item.discourseSlug,
			relativePath: path.relative(ROOT, item.filePath).replaceAll('\\', '/'),
			tags,
		})
	}

	const globalTags = buildGlobalTags(transcriptResults)
	const analysisOutput = {
		meta: {
			generatedAt: new Date().toISOString(),
			sourceDir: path.relative(ROOT, TRANSCRIPTS_DIR).replaceAll('\\', '/'),
			totalFilesWithTags: transcriptResults.length,
			tagCatalogSize: TAG_DEFINITIONS.length,
		},
		globalTags,
		transcripts: transcriptResults,
	}
	const discoverOutput = buildDiscoverPayload(transcriptTexts)

	fs.mkdirSync(path.dirname(ANALYSIS_OUTPUT_PATH), { recursive: true })
	fs.writeFileSync(ANALYSIS_OUTPUT_PATH, `${JSON.stringify(analysisOutput, null, 2)}\n`, 'utf8')
	fs.writeFileSync(DISCOVER_OUTPUT_PATH, JSON.stringify(discoverOutput), 'utf8')

	console.log(`Processed ${processedFiles} transcripts`)
	console.log(`Wrote ${ANALYSIS_OUTPUT_PATH}`)
	console.log(`Wrote ${DISCOVER_OUTPUT_PATH}`)
	console.log(`Discover tags: ${discoverOutput.tags.length}`)
}

main()
