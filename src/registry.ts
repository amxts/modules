// The registry: every `modules/<name>.yml`, checked, and the modules.json the
// site and the amxts command read.
import type { Facts } from './checks'
import type { Entry, Problem } from './entry'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { checkFacts, checkTogether } from './checks'
import { checkEntry, error } from './entry'

export interface Checked {
  file: string
  entry: Entry | null
  problems: Problem[]
}

/** Every file of a `modules/` folder, parsed and checked on its own. */
export function readEntries(dir: string): Checked[] {
  return readdirSync(dir).sort().map((file) => {
    const name = basename(file, '.yml')
    if (!file.endsWith('.yml'))
      return { file, entry: null, problems: [error('an entry is a `.yml` file: `modules/<name>.yml`')] }
    let data: unknown
    try {
      data = Bun.YAML.parse(readFileSync(join(dir, file), 'utf8'))
    }
    catch (cause) {
      return { file, entry: null, problems: [error(`not valid YAML: ${(cause as Error).message}`)] }
    }
    const problems = checkEntry(name, data)
    return { file, entry: problems.length ? null : data as Entry, problems }
  })
}

/**
 * Every entry of a `modules/` folder with all its problems: its own, the
 * ones it makes with the others, and - through `facts` - its repository's and
 * npm's. `only` limits the remote checks to those entries.
 */
export async function check(dir: string, facts: (entry: Entry) => Promise<Facts>, core: string, only?: string[]) {
  const checked = readEntries(dir)
  const entries = checked.flatMap(each => each.entry ? [each.entry] : [])
  const together = checkTogether(entries)
  const remote = new Map(await Promise.all(entries
    .filter(entry => !only?.length || only.includes(entry.name))
    .map(async entry => [entry.name, await facts(entry)] as const)))
  return checked.map(each => ({
    ...each,
    facts: each.entry ? remote.get(each.entry.name) ?? null : null,
    problems: each.entry
      ? [...together.get(each.entry.name)!, ...(remote.has(each.entry.name) ? checkFacts(each.entry, remote.get(each.entry.name)!, core) : [])]
      : each.problems,
  }))
}

/** A module as modules.json lists it. */
export interface Listed extends Omit<Entry, 'logo'> {
  /** the logo's URL, or null */
  logo: string | null
  /** the other listed modules it needs, by npm name: its peer dependencies that are listed */
  requires: string[]
}

/** modules.json: the official modules first, then the rest, each by name. */
export function listing(entries: { entry: Entry, facts: Facts }[]): Listed[] {
  const listed = new Set(entries.map(({ entry }) => entry.npm))
  return entries
    .map(({ entry, facts }) => ({
      name: entry.name,
      npm: entry.npm,
      repo: entry.repo,
      description: entry.description,
      category: entry.category,
      type: entry.type,
      logo: entry.logo ? `https://raw.githubusercontent.com/${entry.repo}/HEAD/${entry.logo}` : null,
      maintainers: entry.maintainers,
      requires: Object.keys(facts.repo?.packageJson?.peerDependencies ?? {}).filter(name => listed.has(name)),
    }))
    .sort((a, b) => Number(a.type !== 'official') - Number(b.type !== 'official') || a.name.localeCompare(b.name))
}
