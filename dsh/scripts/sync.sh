#!/usr/bin/env bash
# Syncs the fork with upstream mattpocock/skills, validates the promoted
# buckets for dsh compatibility, and records the upstream SHA in dsh/UPSTREAM.
set -euo pipefail
cd "$(dirname "$0")/../.."

git fetch upstream
git merge --no-edit upstream/main

node dsh/scripts/validate.mjs

sha=$(git rev-parse upstream/main)
synced=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf 'upstream: https://github.com/mattpocock/skills\nsha: %s\nsynced: %s\n' "$sha" "$synced" > dsh/UPSTREAM
echo "recorded upstream $sha in dsh/UPSTREAM"
