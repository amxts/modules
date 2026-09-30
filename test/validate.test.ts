// The checks, on the entries in fixtures/ and on made-up facts: no request
// leaves the machine.
import type { Facts } from '../src/checks'
import type { Entry } from '../src/entry'
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { checkFacts, skeleton } from '../src/checks'
import { check, listing, readEntries } from '../src/registry'
import { githubRepo } from '../src/remote'

const fixtures = join(import.meta.dir, 'fixtures')
const core = '0.1.0'

/** A module's repository and npm package as a good entry has them. */
function factsOf(entry: Entry, change: (facts: Facts) => void = () => {}): Facts {
  const facts: Facts = {
    repo: {
      archived: false,
      readme: true,
      license: true,
      logo: true,
      packageJson: { name: entry.npm, amxts: { module: 'src/index.ts' }, scripts: { test: 'bun test' }, peerDependencies: { '@amxts/core': '^0.1.0' } },
    },
    npm: { version: '1.0.0', repo: entry.repo },
  }
  change(facts)
  return facts
}

const entries = Object.fromEntries(readEntries(join(fixtures, 'good')).map(each => [each.entry!.name, each.entry!]))
const official = entries['menu-core']!
const community = entries.votes!
const messages = (entry: Entry, change: (facts: Facts) => void) => checkFacts(entry, factsOf(entry, change), core).map(each => `${each.level}: ${each.message}`)

describe('an entry', () => {
  test('good ones pass', async () => {
    const results = await check(join(fixtures, 'good'), async entry => factsOf(entry), core)
    expect(results.map(each => [each.file, each.problems])).toEqual([['menu-core.yml', []], ['votes.yml', []]])
  })

  test('bad ones say what is wrong', async () => {
    const results = await check(join(fixtures, 'bad'), async entry => factsOf(entry), core)
    const problems = Object.fromEntries(results.map(each => [each.file, each.problems.map(problem => `${problem.level}: ${problem.message}`)]))
    expect(problems['menu-core.yml']).toEqual(['error: `menu-core` looks like `menu-c0re` (menu-c0re)'])
    expect(problems['README.md']).toEqual(['error: an entry is a `.yml` file: `modules/<name>.yml`'])
    expect(problems['broken.yml']![0]).toStartWith('error: not valid YAML')
    expect(problems['renamed.yml']).toEqual(['error: `name` is the file\'s name: `renamed`'])
    expect(problems['fake-official.yml']).toEqual(['error: an official module is `@amxts/<name>` on npm and `amxts/<name>` on GitHub'])
    expect(problems['claims-scope.yml']![0]).toStartWith('error: `@amxts/` on npm and `amxts/` on GitHub are for official modules')
    expect(problems['wrong-fields.yml']).toEqual([
      'error: `repo` is required',
      'error: `stars` is not a field of an entry (name, npm, repo, description, category, type, logo, maintainers)',
      'error: `category` is one of ui, gameplay, admin, config, data, network, tools',
      'error: `logo` is a path in the repository to an .svg, .png, .jpg or .webp: `assets/logo.svg`',
      'error: `maintainers` is a list of `- github: <username>`, one at least',
    ])
    expect(problems['menu-c0re.yml']).toEqual([
      'error: `menu-c0re` looks like `menu-core` (@amxts/menu-core)',
      'error: `menu-c0re` is listed by menus too',
      'error: `menu-c0re` looks like `menus` (menu-c0re)',
    ])
    expect(problems['menus.yml']).toEqual([
      'error: `menu-c0re` is listed by menu-c0re too',
      'error: `menus` looks like `menu-c0re` (menu-c0re)',
    ])
  })

  test('a lookalike name is the same once its lookalike letters are one', () => {
    expect(skeleton('menu-c0re')).toBe(skeleton('menu-core'))
    expect(skeleton('@you/Menu_Core')).toBe('youmenucore')
    expect(skeleton('rnenu-core')).toBe(skeleton('menu-core'))
    expect(skeleton('menu-core')).not.toBe(skeleton('menu-cores'))
  })
})

describe('its repository and npm package', () => {
  test('good ones pass', () => {
    expect(messages(official, () => {})).toEqual([])
    expect(messages(community, () => {})).toEqual([])
  })

  test('not on npm yet, with a local link to the core: a warning for an official module, an error for a community one', () => {
    const unpublished = (facts: Facts) => {
      facts.npm = null
      facts.repo!.packageJson!.peerDependencies = { '@amxts/core': 'file:../../amxts' }
    }
    expect(messages(official, unpublished)).toEqual([
      'warning: `@amxts/core` is `file:../../amxts` in peerDependencies, a local link: publish it with a version range, such as `^0.1.0` (an error for a community module)',
      'warning: `@amxts/menu-core` is not on npm (an error for a community module)',
    ])
    expect(messages(community, unpublished).map(each => each.split(':')[0])).toEqual(['error', 'error'])
  })

  test('the repository is missing, or misses a README, a LICENSE or its logo', () => {
    expect(messages(community, (facts) => { facts.repo = null })).toEqual(['error: github.com/someone/amxts-votes is not a public repository'])
    expect(messages(official, (facts) => { Object.assign(facts.repo!, { readme: false, license: false, logo: false }) })).toEqual([
      'error: the repository has no README',
      'error: the repository has no LICENSE',
      'error: the repository has no `assets/logo.svg` (`logo`)',
    ])
  })

  test('package.json: another name, no amxts field, install scripts, no core or a core range that leaves the current one out', () => {
    expect(messages(community, (facts) => { facts.repo!.packageJson = null })).toEqual([
      'error: the repository has no package.json at its root',
    ])
    expect(messages(community, (facts) => {
      facts.repo!.packageJson = { name: 'votes', scripts: { postinstall: 'node steal.js' }, peerDependencies: { '@amxts/core': '^2.0.0' } }
    })).toEqual([
      'error: package.json names the package `votes`, not `amxts-votes`',
      'error: package.json has no `amxts.module`: it is not an amxts module',
      'error: package.json has a `postinstall` script: a module installs without running code',
      'error: `@amxts/core` is `^2.0.0` in peerDependencies, and the current core, 0.1.0, is not in it',
    ])
    expect(messages(community, (facts) => { delete facts.repo!.packageJson!.peerDependencies })).toEqual([
      'error: package.json has no `@amxts/core` in `peerDependencies`',
    ])
  })

  test('the npm package is another repository\'s', () => {
    expect(messages(community, (facts) => { facts.npm!.repo = 'thief/amxts-votes' })).toEqual([
      'error: `amxts-votes` on npm points at github.com/thief/amxts-votes, not github.com/someone/amxts-votes',
    ])
  })

  test('a repository URL as package.json writes it', () => {
    expect(githubRepo('git+https://github.com/amxts/menu-core.git')).toBe('amxts/menu-core')
    expect(githubRepo('https://github.com/amxts/menu-core/tree/main')).toBe('amxts/menu-core')
    expect(githubRepo('github:someone/votes')).toBe('someone/votes')
    expect(githubRepo('someone/votes')).toBe('someone/votes')
    expect(githubRepo('https://gitlab.com/someone/votes')).toBe(null)
  })
})

describe('modules.json', () => {
  test('the official modules first; a logo\'s URL; the listed modules it needs', () => {
    const configCore = { ...official, name: 'config-core', npm: '@amxts/config-core', repo: 'amxts/config-core', logo: undefined }
    const listed = listing([
      { entry: community, facts: factsOf(community) },
      { entry: official, facts: factsOf(official, (facts) => { facts.repo!.packageJson!.peerDependencies = { '@amxts/core': '^0.1.0', '@amxts/config-core': '^0.1.0', 'left-pad': '*' } }) },
      { entry: configCore, facts: factsOf(configCore) },
    ])
    expect(listed.map(each => [each.name, each.logo, each.requires])).toEqual([
      ['config-core', null, []],
      ['menu-core', 'https://raw.githubusercontent.com/amxts/menu-core/HEAD/assets/logo.svg', ['@amxts/config-core']],
      ['votes', null, []],
    ])
  })
})
