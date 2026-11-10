# dsh-coding-preset

A curated set of coding skill repositories, vendored as git subtrees and
installed into [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(dsh) as a single agent preset named **Coding**.

The preset is a copy of the shipped **standard** preset with one change: the
`skill-filesystem` plugin gets extra skill roots pointing at the vendored
upstreams, so the skills load only in sessions that pick the **Coding**
preset. Other presets and sessions are unaffected.

## Layout

```
.
├── dsh/                    # the preset project
│   ├── cordis.patch.yml    # generated preset patch (do not edit by hand)
│   ├── upstreams.mjs       # the manifest: which upstreams, which skill dirs
│   ├── UPSTREAMS           # record of the last synced upstream SHAs
│   └── scripts/            # install.mjs, validate.mjs, sync.mjs
└── upstreams/
    └── mattpocock/         # git subtree of https://github.com/mattpocock/skills
        └── skills/         # engineering/ and productivity/ are contributed
```

Every upstream under `upstreams/` is a full vendored copy of its repository,
kept syncable with its origin through `git subtree pull`. The preset project
itself lives only at the root and in `dsh/`.

## Install

```bash
git clone <this repo>
cd dsh-coding-preset
npm run dsh:install
```

Options: `--profile <name>` (default `web`), `--generate-only` (regenerate
the patch without installing), `--dsh <path>` (when auto-detection fails).

dsh installs the bundle from this directory by link, so **do not move or
delete the clone** afterwards. To relocate it, move it and re-run the install.
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

## Add another upstream skill repository

1. Append an entry to [`dsh/upstreams.mjs`](./dsh/upstreams.mjs): repo URL,
   ref, target prefix under `upstreams/`, and the skill directories it
   contributes.
2. `npm run dsh:sync` vendors it with `git subtree add` on first sync and
   validates the combined skill set.
3. `npm run dsh:install` regenerates the patch so the new skill roots reach
   the preset.

Skill name collisions across upstreams are rejected by the validator, so a
collision forces a deliberate choice instead of a silent override.

## Sync upstreams

```bash
npm run dsh:sync
```

Runs `git subtree pull --squash` for every entry in `dsh/upstreams.mjs`,
validates all skill directories (including duplicate names across repos),
and records the synced SHAs in `dsh/UPSTREAMS`. Requires a clean working
tree. Local edits inside `upstreams/<name>/` survive the pull, but consider
sending them upstream instead.

## Validate

```bash
npm run dsh:validate
```

Checks every contributed skill directory against the rules of
`@deepseek-ai/dsh-skill-filesystem`: kebab-case `name`, required
`description`, strict boolean spellings for the invocation flags, one-level
discovery depth, and no duplicate names across upstreams. dsh skips invalid
entries with only a log warning, so CI runs this on every change to
`upstreams/` or `dsh/`.

## Uninstall

```bash
dsh plugin --profile web remove dsh-coding-preset
```

## Limitations

- The preset plugin list is copied from the standard preset at install time.
  If dsh changes that preset's structure (beyond adding or removing rows),
  the generator may fail; it will say so loudly.
- The vendored skills were written for Claude Code style harnesses.
  References to Claude-specific tools, slash commands, or `~/.claude` paths
  may not map to dsh equivalents. Treat such passages as guidance, not
  literal commands.
- Each upstream may promote only part of its skill set: mattpocock
  contributes `skills/engineering` and `skills/productivity`, matching its
  own promotion policy (`misc`, `in-progress`, and `deprecated` stay out).

## License

The preset project at the repository root is MIT licensed (see
[LICENSE](./LICENSE)). Each vendored upstream keeps its own license under
`upstreams/<name>/LICENSE`.
