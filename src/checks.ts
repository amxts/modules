// The checks an entry passes against the others, and against what its
// repository and npm say (the facts, fetched by remote.ts).
import type { Entry, Problem } from './entry'
import { error, warning } from './entry'

/** What the repository on GitHub and the package on npm say about an entry. */
export interface Facts {
  /** null: no such public repository */
  repo: {
    archived: boolean
    readme: boolean
    license: boolean
    /** the package.json at the root of its default branch */
    packageJson: PackageJson | null
    /** whether the entry's logo is there; true without a logo */
    logo: boolean
  } | null
  /** null: not published */
  npm: {
    version: string
    /** the GitHub repository its latest version points at, `owner/name` */
    repo: string | null
    /** its latest version's peerDependencies */
    peerDependencies?: Record<string, string>
  } | null
}

export interface PackageJson {
  name?: string
  amxts?: { module?: string }
  scripts?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const installScripts = ['preinstall', 'install', 'postinstall']

/** A spec that links a folder rather than naming versions: fine in a checkout, broken once published. */
const localSpec = /^(?:file|link|workspace|portal):/

/**
 * Whether an official module must be on npm, as a community one must. The
 * official modules were listed before they were published, so for them "not
 * on npm" is a warning while this is false.
 */
export const OFFICIAL_ON_NPM = false

/**
 * What an entry's repository and npm package break. `core` is the version
 * of @amxts/core a module must take. A check that needs the module published
 * is an error, and a warning for an official one until `officialOnNpm`.
 * What the module asks of the core is read off its package on npm once it is
 * there - a checkout may link the core's folder - else off its repository.
 */
export function checkFacts(entry: Entry, facts: Facts, core: string, officialOnNpm = OFFICIAL_ON_NPM): Problem[] {
  const lenient = entry.type === 'official' && !officialOnNpm
  const beforePublishing = lenient && !facts.npm ? warning : error
  const note = lenient && !facts.npm ? ' (an error for a community module)' : ''
  const repo = facts.repo
  if (!repo)
    return [error(`github.com/${entry.repo} is not a public repository`)]

  const pkg = repo.packageJson
  const peer = (facts.npm ? facts.npm.peerDependencies : pkg?.peerDependencies)?.['@amxts/core']
  const problems: [boolean, Problem][] = [
    [repo.archived, warning(`github.com/${entry.repo} is archived`)],
    [!repo.readme, error('the repository has no README')],
    [!repo.license, error('the repository has no LICENSE')],
    [!repo.logo, error(`the repository has no \`${entry.logo}\` (\`logo\`)`)],
    [!pkg, error('the repository has no package.json at its root')],
    [!!pkg && pkg.name !== entry.npm, error(`package.json names the package \`${pkg?.name}\`, not \`${entry.npm}\``)],
    [!!pkg && !pkg.amxts?.module, error('package.json has no `amxts.module`: it is not an amxts module')],
    ...installScripts.map((script): [boolean, Problem] => [!!pkg?.scripts?.[script], error(`package.json has a \`${script}\` script: a module installs without running code`)]),
    [!!pkg && !peer, error(`${facts.npm ? `\`${entry.npm}\` on npm` : 'package.json'} has no \`@amxts/core\` in \`peerDependencies\``)],
    [!!peer && localSpec.test(peer), beforePublishing(`\`@amxts/core\` is \`${peer}\` in peerDependencies, a local link: publish it with a version range, such as \`^${core}\`${note}`)],
    [!!peer && !localSpec.test(peer) && !satisfies(core, peer), error(`\`@amxts/core\` is \`${peer}\` in peerDependencies, and the current core, ${core}, is not in it`)],
    [!facts.npm, beforePublishing(`\`${entry.npm}\` is not on npm${note}`)],
    [!!facts.npm && facts.npm.repo?.toLowerCase() !== entry.repo.toLowerCase(), error(`\`${entry.npm}\` on npm points at ${facts.npm?.repo ? `github.com/${facts.npm.repo}` : 'no GitHub repository'}, not github.com/${entry.repo}`)],
  ]
  return problems.filter(([broken]) => broken).map(([, problem]) => problem)
}

function satisfies(version: string, range: string) {
  try {
    return Bun.semver.satisfies(version, range)
  }
  catch {
    return false
  }
}

/**
 * What the entries break together, by entry name - each of a pair gets it:
 * an npm package or a repository listed twice, and a name that looks like another's - the same
 * letters once the lookalike ones are made one (`menu-c0re`, `menucore`), an
 * error; one letter away (`menu-cores`), a warning for the reviewer.
 */
export function checkTogether(entries: Entry[]): Map<string, Problem[]> {
  const problems = new Map(entries.map(entry => [entry.name, [] as Problem[]]))
  for (const entry of entries) {
    for (const other of entries.filter(each => each !== entry)) {
      const own = problems.get(entry.name)!
      if (other.npm === entry.npm)
        own.push(error(`\`${entry.npm}\` is listed by ${other.name} too`))
      if (other.repo.toLowerCase() === entry.repo.toLowerCase())
        own.push(error(`github.com/${entry.repo} is listed by ${other.name} too`))
      const pairs = [[entry.name, other.name], [entry.npm, other.npm]] as const
      if (pairs.some(([a, b]) => skeleton(a) === skeleton(b)))
        own.push(error(`\`${entry.name}\` looks like \`${other.name}\` (${other.npm})`))
      else if (pairs.some(([a, b]) => oneEditApart(skeleton(a), skeleton(b))))
        own.push(warning(`\`${entry.name}\` is one letter away from \`${other.name}\` (${other.npm}): make sure it is not taken for it`))
    }
  }
  return problems
}

const lookalikes: [RegExp, string][] = [
  [/rn/g, 'm'],
  [/vv/g, 'w'],
  [/[0]/g, 'o'],
  [/[1il|]/g, 'l'],
  [/3/g, 'e'],
  [/4/g, 'a'],
  [/5/g, 's'],
  [/7/g, 't'],
  [/8/g, 'b'],
  [/[^a-z]/g, ''],
]

/** A name with its lookalike letters made one and its punctuation dropped: `@you/Menu_C0re` is `youmenucore`. */
export function skeleton(name: string) {
  return lookalikes.reduce((text, [from, to]) => text.replace(from, to), name.toLowerCase())
}

/** Two names of five letters or more one insertion, deletion or change apart. */
function oneEditApart(a: string, b: string) {
  if (a === b || Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1)
    return false
  let i = 0
  while (i < a.length && a[i] === b[i])
    i++
  const rest = (x: string, skip: number) => x.slice(i + skip)
  return rest(a, 1) === rest(b, 1) || rest(a, 1) === rest(b, 0) || rest(a, 0) === rest(b, 1)
}
