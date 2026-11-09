# MattPocock preset for DeepSeek Harness

This directory turns the promoted [Matt Pocock skills](https://github.com/mattpocock/skills)
(`skills/engineering` and `skills/productivity`) into a preset-scoped skill set
for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

The skills are loaded only when you select the **MattPocock** preset. Other
presets and sessions are unaffected, because the skill roots are injected
through the preset-local `customSkillDirs` option of
`@deepseek-ai/dsh-skill-filesystem`.

## How it works

- `cordis.patch.yml` declares a `preset-mattpocock` row whose plugin list is a
  copy of the shipped **standard** preset, with one change: the
  `skill-filesystem` row gets two extra skill roots pointing at
  `skills/engineering` and `skills/productivity` in this repository.
- The paths are resolved at mount time relative to the patch file, so the
  preset works no matter where the repository is installed.
- `scripts/install.mjs` **regenerates** `cordis.patch.yml` from the
  `standard.patch.yml` of the dsh version installed on your machine, so the
  preset never drifts from your dsh version. If your dsh installation is not
  readable (Desktop asar builds), it falls back to the checked-in patch and
  warns.

## Install

```bash
git clone https://github.com/kimiellen/dsh-MattPocock-preset.git
cd dsh-MattPocock-preset
npm run dsh:install
```

Options:

- `--profile <name>`: target profile, default `web`.
- `--generate-only`: regenerate `dsh/cordis.patch.yml` without installing.
- `--dsh <path>`: path to the `@deepseek-ai/dsh` package, when auto-detection
  fails.

The install script runs `dsh plugin --profile <name> add <this repo>`. dsh
installs the bundle from this directory by link, so **do not move or delete
the clone** afterwards. To relocate it, move it and re-run the install.

Then open the dsh Web GUI, start a **new session**, and pick the
**MattPocock** preset. Existing sessions keep the preset revision they
started with.

## Upgrade

```bash
git pull
npm run dsh:install   # regenerates the patch and upgrades the bundle
```

The skill provider watches its roots, so skill-only updates reach the next
session without reinstalling. A reinstall is only needed when the preset
plugin list itself changes (after a dsh upgrade, for example).

## Uninstall

```bash
dsh plugin --profile web remove dsh-mattpocock-preset
```

## For maintainers of this fork

Sync with upstream and validate:

```bash
npm run dsh:sync
```

This merges `upstream/main`, runs the dsh compatibility validation, and
records the upstream SHA in `dsh/UPSTREAM`.

`npm run dsh:validate` checks every promoted skill against the rules of
`@deepseek-ai/dsh-skill-filesystem`: kebab-case `name`, required
`description`, strict boolean spellings for the invocation flags, one-level
discovery depth, and no duplicate names across the two buckets. dsh skips
invalid entries with only a log warning, so CI runs this on every change to
`skills/`.

## Limitations

- The preset plugin list is copied from the standard preset at install time.
  If dsh changes that preset's structure (beyond adding or removing rows), the
  generator may fail; it will say so loudly.
- The skills were written for Claude Code style harnesses. References to
  Claude-specific tools, slash commands, or `~/.claude` paths may not map to
  dsh equivalents. Treat such passages as guidance, not literal commands.
- `skills/misc`, `skills/in-progress`, and `skills/deprecated` are not loaded,
  matching the upstream promotion policy.
