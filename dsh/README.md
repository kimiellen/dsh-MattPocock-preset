# Coding preset for DeepSeek Harness

This directory turns the skill directories of every upstream vendored under
[`upstreams/`](../upstreams) into a preset-scoped skill set for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

The skills are loaded only when you select the **Coding** preset. Other
presets and sessions are unaffected, because the skill roots are injected
through the preset-local `customSkillDirs` option of
`@deepseek-ai/dsh-skill-filesystem`.

## How it works

- `upstreams.mjs` is the manifest. Each entry names an upstream repository,
  its vendored prefix under `upstreams/`, and the skill directories it
  contributes.
- `cordis.patch.yml` declares a `preset-coding` row whose plugin list is a
  copy of the shipped **standard** preset, with one change: the
  `skill-filesystem` row gets one extra skill root per contributed skill
  directory in the manifest.
- The paths are resolved at mount time by locating this package through Node
  resolution from the profile directory (the loader `baseUrl`), so the preset
  works no matter where the repository is installed. Bundle patches are merged
  into the profile's root include, so `baseUrl` is never the patch file itself.
- `scripts/install.mjs` **regenerates** `cordis.patch.yml` from the
  `standard.patch.yml` of the dsh version installed on your machine, so the
  preset never drifts from your dsh version. If your dsh installation is not
  readable (Desktop asar builds), it falls back to the checked-in patch and
  warns.

## Install

```bash
git clone <this repo>
cd dsh-coding-preset
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

Then open the dsh Web GUI, start a **new session**, and pick the **Coding**
preset. Existing sessions keep the preset revision they started with.

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
dsh plugin --profile web remove dsh-coding-preset
```

## For maintainers of this repository

Sync every vendored upstream and validate:

```bash
npm run dsh:sync
```

For each entry in `dsh/upstreams.mjs` this runs `git subtree pull --squash`
(or `git subtree add` on first sync), then validates the combined skill set
and records the upstream SHAs in `dsh/UPSTREAMS`. It requires a clean
working tree.

To add another upstream skill repository, append an entry to
`dsh/upstreams.mjs`, run `npm run dsh:sync`, then `npm run dsh:install`.

`npm run dsh:validate` checks every contributed skill directory against the
rules of `@deepseek-ai/dsh-skill-filesystem`: kebab-case `name`, required
`description`, strict boolean spellings for the invocation flags, one-level
discovery depth, and no duplicate skill names across upstreams. dsh skips
invalid entries with only a log warning, and resolves duplicate names
silently, so CI runs this on every change to `upstreams/` or `dsh/`.

## Limitations

- The preset plugin list is copied from the standard preset at install time.
  If dsh changes that preset's structure (beyond adding or removing rows), the
  generator may fail; it will say so loudly.
- The vendored skills were written for Claude Code style harnesses. References
  to Claude-specific tools, slash commands, or `~/.claude` paths may not map to
  dsh equivalents. Treat such passages as guidance, not literal commands.
- Each upstream decides which of its skill directories are contributed; see
  its entry in `dsh/upstreams.mjs`.
