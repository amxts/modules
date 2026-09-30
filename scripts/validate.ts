// Checks the entries in modules/ and says what each breaks.
//
//   bun run validate                  every entry
//   bun run validate menu-core        every entry on its own and together,
//                                     the repository and npm of menu-core only
//   bun run build                     every entry, then modules.json
//
// An error fails it; a warning is for the reviewer.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { check, listing } from '../src/registry'
import { coreVersion, fetchFacts } from '../src/remote'

const root = join(import.meta.dir, '..')
const write = process.argv.includes('--write')
const only = process.argv.slice(2).filter(arg => !arg.startsWith('--'))

const core = await coreVersion()
const results = await check(join(root, 'modules'), fetchFacts, core, only)

console.log(`@amxts/core ${core}\n`)
for (const { file, problems } of results) {
  console.log(`${problems.some(each => each.level === 'error') ? '✖' : problems.length ? '⚠' : '✔'} ${file}`)
  for (const problem of problems)
    console.log(`    ${problem.level === 'error' ? 'error  ' : 'warning'}  ${problem.message}`)
}

const errors = results.flatMap(each => each.problems).filter(each => each.level === 'error').length
const warnings = results.flatMap(each => each.problems).length - errors
console.log(`\n${results.length} entries, ${errors} errors, ${warnings} warnings`)
if (errors) {
  process.exitCode = 1
}
else if (write) {
  const modules = listing(results.map(({ entry, facts }) => ({ entry: entry!, facts: facts! })))
  writeFileSync(join(root, 'modules.json'), `${JSON.stringify(modules, null, 2)}\n`)
  console.log(`modules.json: ${modules.length} modules`)
}
