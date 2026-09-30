# amxts modules

**English** | [Русский](README.ru.md)

The catalog of [amxts](https://amxts.github.io) modules: the list the site
shows at [amxts.github.io/modules](https://amxts.github.io/modules) and the
`amxts` command offers in `amxts init` and `amxts module add`. A module is
listed by a file in `modules/`, added with a pull request; CI checks every
entry, and a maintainer reviews it. How to add yours:
[CONTRIBUTING.md](CONTRIBUTING.md).

## An entry

`modules/votes.yml`:

```yaml
name: votes
npm: amxts-votes
repo: someone/amxts-votes
description: Map and kick votes with a menu
category: gameplay
type: community
logo: assets/logo.svg
maintainers:
  - github: someone
```

| field | what |
| --- | --- |
| `name` | the module's name in the catalog, lowercase-kebab, the same as the file's: `amxts module add votes`, `amxts.github.io/modules/votes` |
| `npm` | the npm package: what gets installed |
| `repo` | the GitHub repository, `owner/name`: its README is the module's page on the site |
| `description` | one line in English, 120 characters at most |
| `category` | one of the categories below |
| `type` | `official` or `community` |
| `logo` | optional: a path in the repository to an `.svg`, `.png`, `.jpg` or `.webp` - shown on the module's card |
| `maintainers` | who answers for it, by their GitHub names |

| category | for |
| --- | --- |
| `ui` | menus, HUD, chat and messages |
| `gameplay` | rules of the game: players, teams, modes |
| `admin` | server administration: bans, access, votes |
| `config` | configs and settings |
| `data` | storing data: files, databases, stats |
| `network` | HTTP, sockets, talking to other services |
| `tools` | helpers for writing and testing plugins |

## Official and community

An **official** module is made by the amxts team: `@amxts/<name>` on npm,
`amxts/<name>` on GitHub, and only an official module lives there. A
**community** module is anyone else's, under its author's name on npm and
GitHub. Both are listed the same way and pass the same checks; the site marks
which is which.

## modules.json

The entries as one file, built by `bun run build` and committed by CI on
every push to `main`:

```
https://raw.githubusercontent.com/amxts/modules/main/modules.json
```

An array of the entries, the official modules first, each with its fields
and:

- `logo` - the logo's URL (`https://raw.githubusercontent.com/<repo>/HEAD/<logo>`),
  or `null`;
- `requires` - the listed modules it needs, by npm name: its
  `peerDependencies` that are in the catalog.

The site and the `amxts` command read it.

## Working here

Needs [Bun](https://bun.sh).

```sh
bun install
bun test                     # the checks, on fixtures, offline
bun run validate             # every entry, with its repository and npm package
bun run validate votes       # every entry, the repository and npm of votes only
bun run build                # validate, then write modules.json
```

Without a `GITHUB_TOKEN` in the environment GitHub answers 60 requests an
hour, and a check takes two per entry.

## License

[MIT](LICENSE)
