# Модули amxts

[English](README.md) | **Русский**

Каталог модулей [amxts](https://amxts.github.io/ru): список, который сайт
показывает на [amxts.github.io/ru/modules](https://amxts.github.io/ru/modules),
а команда `amxts` предлагает в `amxts init` и `amxts module add`. Модуль
попадает в каталог файлом в `modules/`, добавленным через pull request; CI
проверяет каждую запись, а мейнтейнер её просматривает. Как добавить свой —
[CONTRIBUTING.ru.md](CONTRIBUTING.ru.md).

## Запись

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

| поле | что это |
| --- | --- |
| `name` | имя модуля в каталоге, строчными через дефис, такое же, как у файла: `amxts module add votes`, `amxts.github.io/modules/votes` |
| `npm` | пакет на npm: то, что ставится |
| `repo` | репозиторий на GitHub, `owner/name`: его README — страница модуля на сайте |
| `description` | одна строка, не длиннее 120 символов, по-английски |
| `category` | одна из категорий ниже |
| `type` | `official` или `community` |
| `logo` | необязательно: путь в репозитории к `.svg`, `.png`, `.jpg` или `.webp` — показывается на карточке модуля |
| `maintainers` | кто за него отвечает, по именам на GitHub |

| категория | для чего |
| --- | --- |
| `ui` | меню, HUD, чат и сообщения |
| `gameplay` | правила игры: игроки, команды, режимы |
| `admin` | администрирование сервера: баны, доступ, голосования |
| `config` | конфиги и настройки |
| `data` | хранение данных: файлы, базы данных, статистика |
| `network` | HTTP, сокеты, связь с другими сервисами |
| `tools` | помощь в написании и тестировании плагинов |

## Официальные и от сообщества

**Официальный** модуль делает команда amxts: `@amxts/<name>` на npm,
`amxts/<name>` на GitHub — и там живут только официальные модули. Модуль
**от сообщества** (`community`) — любой другой, под именем своего автора на
npm и GitHub. Оба попадают в каталог одинаково и проходят одни и те же
проверки; сайт показывает, какой из них какой.

## modules.json

Все записи одним файлом, его собирает `bun run build`, а CI коммитит при
каждом пуше в `main`:

```
https://raw.githubusercontent.com/amxts/modules/main/modules.json
```

Массив записей, официальные модули первыми, у каждой — её поля и ещё:

- `logo` — адрес логотипа (`https://raw.githubusercontent.com/<repo>/HEAD/<logo>`)
  или `null`;
- `requires` — модули из каталога, которые ему нужны, по именам на npm: те
  его `peerDependencies`, что есть в каталоге.

Его читают сайт и команда `amxts`.

## Работа с репозиторием

Нужен [Bun](https://bun.sh).

```sh
bun install
bun test                     # проверки на примерах, без сети
bun run validate             # каждая запись, с её репозиторием и пакетом на npm
bun run validate votes       # каждая запись, репозиторий и npm — только у votes
bun run build                # проверка, затем modules.json
```

Без `GITHUB_TOKEN` в окружении GitHub отвечает на 60 запросов в час, а на
проверку уходит два запроса на запись.

## Лицензия

[MIT](LICENSE)
