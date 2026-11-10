// The upstream skill repositories vendored into this repository as git
// subtrees, and the skill directories each one contributes to the coding
// preset. install.mjs turns every <prefix>/<skillDir> pair into a
// customSkillDirs entry; validate.mjs checks all of them, including
// duplicate skill names across upstreams.
//
// dsh resolves duplicate skill names across roots silently, so a collision
// between two upstreams must be settled here: drop one of the skillDirs, or
// accept that the winner is undefined until validate.mjs grows an explicit
// precedence rule. validate.mjs fails on duplicates, so collisions cannot
// sneak in.
//
// To add another upstream:
//   1. Append an entry below.
//   2. Run: node dsh/scripts/sync.mjs   (subtree-adds it on first sync)
//   3. Run: npm run dsh:install         (regenerates the patch, reinstalls)
export default [
  {
    name: 'mattpocock',
    repo: 'https://github.com/mattpocock/skills',
    ref: 'main',
    prefix: 'upstreams/mattpocock',
    skillDirs: ['skills/engineering', 'skills/productivity'],
  },
];
