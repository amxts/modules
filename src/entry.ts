// A module's entry, `modules/<name>.yml`, and the checks it passes on its own:
// the fields, their shapes, and what "official" may claim.

export const categories = ['ui', 'gameplay', 'admin', 'config', 'data', 'network', 'tools'] as const
export const types = ['official', 'community'] as const

export type Category = typeof categories[number]
export type ModuleType = typeof types[number]

export interface Entry {
  name: string
  npm: string
  repo: string
  description: string
  category: Category
  type: ModuleType
  logo?: string
  maintainers: { github: string }[]
}

export interface Problem {
  level: 'error' | 'warning'
  message: string
}

/** The npm scope and the GitHub organization only an official module lives under. */
export const officialScope = '@amxts/'
export const officialOrg = 'amxts/'

const fields = ['name', 'npm', 'repo', 'description', 'category', 'type', 'logo', 'maintainers']
const required = fields.filter(field => field !== 'logo')

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const npmName = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/
const githubRepo = /^[\w.-]+\/[\w.-]+$/
const githubUser = /^[a-z\d](?:[a-z\d-]{0,38})$/i
const logoFile = /^(?!\/)(?!.*\.\.)[\w./-]+\.(?:svg|png|jpe?g|webp)$/i

export const error = (message: string): Problem => ({ level: 'error', message })
export const warning = (message: string): Problem => ({ level: 'warning', message })

const text = (value: unknown) => typeof value === 'string' && value.trim() !== ''

/**
 * The problems of one file's data, read from `modules/<file>.yml`. None
 * means the data is an `Entry`.
 */
export function checkEntry(file: string, data: unknown): Problem[] {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return [error('the file is not a YAML mapping of fields')]
  const entry = data as Record<string, unknown>
  const has = (field: string) => entry[field] !== undefined

  const rules: [boolean, string][] = [
    ...required.map((field): [boolean, string] => [has(field), `\`${field}\` is required`]),
    ...Object.keys(entry).map((field): [boolean, string] => [fields.includes(field), `\`${field}\` is not a field of an entry (${fields.join(', ')})`]),
    [!has('name') || (typeof entry.name === 'string' && kebab.test(entry.name)), '`name` is lowercase-kebab: `menu-core`'],
    [!has('name') || entry.name === file, `\`name\` is the file's name: \`${file}\``],
    [!has('npm') || (typeof entry.npm === 'string' && npmName.test(entry.npm) && entry.npm.length <= 214), '`npm` is an npm package name: `amxts-votes`, `@you/votes`'],
    [!has('repo') || (typeof entry.repo === 'string' && githubRepo.test(entry.repo)), '`repo` is a GitHub repository, `owner/name`'],
    [!has('description') || (text(entry.description) && !String(entry.description).includes('\n')), '`description` is one line of text'],
    [!has('description') || String(entry.description).length <= 120, '`description` is 120 characters at most'],
    [!has('category') || categories.includes(entry.category as Category), `\`category\` is one of ${categories.join(', ')}`],
    [!has('type') || types.includes(entry.type as ModuleType), `\`type\` is one of ${types.join(', ')}`],
    [!has('logo') || (typeof entry.logo === 'string' && logoFile.test(entry.logo)), '`logo` is a path in the repository to an .svg, .png, .jpg or .webp: `assets/logo.svg`'],
    [!has('maintainers') || (Array.isArray(entry.maintainers) && entry.maintainers.length > 0
      && entry.maintainers.every(each => each && typeof each === 'object' && Object.keys(each).join() === 'github' && githubUser.test(String(each.github)))), '`maintainers` is a list of `- github: <username>`, one at least'],
  ]
  const problems = rules.filter(([ok]) => !ok).map(([, message]) => error(message))
  if (problems.length)
    return problems

  // Only an official module is under the amxts scope and organization, and it is under both.
  const official = entry.type === 'official'
  const scoped = String(entry.npm).startsWith(officialScope)
  const inOrg = String(entry.repo).toLowerCase().startsWith(officialOrg)
  if (official && !(scoped && inOrg))
    return [error(`an official module is \`${officialScope}<name>\` on npm and \`${officialOrg}<name>\` on GitHub`)]
  if (!official && (scoped || inOrg))
    return [error(`\`${officialScope}\` on npm and \`${officialOrg}\` on GitHub are for official modules: a community module lives under its author's name`)]
  return []
}
