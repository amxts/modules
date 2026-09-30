# Adding a module

**English** | [Русский](CONTRIBUTING.ru.md)

A module gets into the amxts catalog - the site's
[modules](https://amxts.github.io/modules) and the `amxts` command's list -
with a pull request that adds its entry here. Being on npm is not enough:
only what this repository lists is in the catalog.

## Before you open it

The module is an amxts module package (see
[creating a module](https://amxts.github.io/docs/modules/creating-a-module)),
and:

- its repository on GitHub is public, with a `README.md` - the module's page
  on the site - and a `LICENSE`;
- the `package.json` at the repository's root has the package's `name`, the
  `amxts` field with `module`, and `@amxts/core` in `peerDependencies` as a
  version range the current core is in (`^0.1.0`);
- `package.json` has no `preinstall`, `install` or `postinstall` script;
- it is published on npm, and the published `package.json` points
  `repository` at the same GitHub repository.

## The pull request

1. Fork this repository.
2. Add `modules/<name>.yml`: the fields are in the [README](README.md#an-entry).
   `type` is `community`; `category` is the one that fits best.
3. Check it, if you have [Bun](https://bun.sh):

   ```sh
   bun install
   bun run validate <name>
   ```

4. Open a pull request. CI checks it, a maintainer reviews it, and once it is
   merged the module is in the catalog: `modules.json` is rebuilt on `main`,
   the site brings it in with its next build (daily), and `amxts` sees it within
   minutes.

Do not edit `modules.json`: CI builds it from the entries.

## What CI checks

Every entry, on every pull request and push:

- **the file**: YAML with the known fields only; `name`, `npm`, `repo`,
  `description`, `category`, `type` and `maintainers` present; `name`
  lowercase-kebab and the file's name; `category` and `type` from their
  lists; `logo` a path inside the repository;
- **the other entries**: no npm package or repository listed twice, and no
  name that looks like another's - `menu-c0re` next to `menu-core` is an
  error, a name one letter away from another is a warning for the reviewer;
- **the repository**: it is public, has a README and a LICENSE, and the logo
  when one is given; its `package.json` names the `npm` package, has
  `amxts.module`, takes the current `@amxts/core` in its peer range and has
  no install scripts;
- **npm**: the package is published, and its `repository` is the entry's.

An error fails the check; a warning is left to the reviewer.

## Official and community

An official module is made by the amxts team: `@amxts/<name>` on npm and
`amxts/<name>` on GitHub, `type: official`. Only an official module may use
that scope and that organization, and an official module uses both. Every
other module is `type: community`, under its author's name.

An official module passes the same checks as a community one: it is on npm,
and asks for the core by a version range. (`OFFICIAL_ON_NPM` in
`src/checks.ts` set to `false` makes "not on npm yet" and a local link to the
core in `peerDependencies` warnings for official modules, for listing one
before it is published.)

What a module asks of the core is read off its package on npm once it is
published, else off its repository: a repository may link the core's folder in
`peerDependencies`, as a checkout beside the core does, and publish it with a
version range.

## Changing or removing an entry

A pull request that edits or deletes the file, from one of its
`maintainers`. A module whose repository is gone, archived or broken for the
checks may be removed by the amxts team.
