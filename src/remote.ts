// What GitHub and npm say about an entry: the facts checks.ts judges. Without
// a token GitHub answers 60 requests an hour, two per entry here; CI passes
// its GITHUB_TOKEN.
import type { Facts, PackageJson } from './checks'
import type { Entry } from './entry'

const token = process.env.GITHUB_TOKEN
const githubHeaders = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'amxts-modules', ...(token && { Authorization: `Bearer ${token}` }) }

/** A GET that answers null on 404 and throws on anything else unexpected, so an outage is not taken for a missing file. */
async function get(url: string, headers: Record<string, string> = {}): Promise<Response | null> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (response.status === 404)
    return null
  if (!response.ok)
    throw new Error(`${url}: HTTP ${response.status} ${await response.text().catch(() => '')}`.trim())
  return response
}

const json = async <T>(url: string, headers?: Record<string, string>) => (await (await get(url, headers))?.json() ?? null) as T | null
const exists = async (url: string) => (await get(url)) !== null
const raw = (repo: string, branch: string, path: string) => `https://raw.githubusercontent.com/${repo}/${branch}/${path}`

/** `owner/name` of a GitHub URL as package.json writes it: `git+https://github.com/owner/name.git`, `github:owner/name`, `owner/name`. */
export function githubRepo(url: string | undefined) {
  const match = url?.match(/^(?:github:)?([\w.-]+\/[\w.-]+?)(?:\.git)?$/) ?? url?.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?(?:[#/].*)?$/)
  return match?.[1] ?? null
}

async function repoFacts(entry: Entry): Promise<Facts['repo']> {
  const repo = await json<{ private: boolean, archived: boolean, default_branch: string, license: object | null }>(`https://api.github.com/repos/${entry.repo}`, githubHeaders)
  if (!repo || repo.private)
    return null
  const file = (path: string) => raw(entry.repo, repo.default_branch, path)
  const [readme, packageJson, logo] = await Promise.all([
    get(`https://api.github.com/repos/${entry.repo}/readme`, githubHeaders).then(Boolean),
    json<PackageJson>(file('package.json')),
    entry.logo ? exists(file(entry.logo)) : true,
  ])
  return { archived: repo.archived, readme, license: repo.license !== null, packageJson, logo }
}

async function npmFacts(entry: Entry): Promise<Facts['npm']> {
  const latest = await json<{ version: string, repository?: string | { url?: string }, peerDependencies?: Record<string, string> }>(`https://registry.npmjs.org/${entry.npm.replace('/', '%2F')}/latest`)
  if (!latest)
    return null
  const url = typeof latest.repository === 'string' ? latest.repository : latest.repository?.url
  return { version: latest.version, repo: githubRepo(url), peerDependencies: latest.peerDependencies }
}

export async function fetchFacts(entry: Entry): Promise<Facts> {
  const [repo, npm] = await Promise.all([repoFacts(entry), npmFacts(entry)])
  return { repo, npm }
}

/**
 * The version of @amxts/core a module must take: the latest on npm, or the
 * core repository's package.json while it is not published.
 */
export async function coreVersion(): Promise<string> {
  const published = await json<{ version: string }>('https://registry.npmjs.org/@amxts%2Fcore/latest')
  const source = published ?? await json<{ version: string }>(raw('amxts/amxts', 'HEAD', 'package.json'))
  if (!source?.version)
    throw new Error('no version of @amxts/core: neither npm nor github.com/amxts/amxts answered')
  return source.version
}
