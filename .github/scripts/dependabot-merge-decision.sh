#!/usr/bin/env bash
# Decide whether one Dependabot pull request may merge itself.
#
# Usage: dependabot-merge-decision.sh <author-login> <pr-title>
# Prints "merge" on stdout, or "skip: <reason>", and always exits 0 — a title
# this cannot parse is a reason to leave the PR for a human, not a CI failure.
set -euo pipefail

login=${1-}
title=${2-}

if [ "$login" != "app/dependabot" ] && [ "$login" != "dependabot[bot]" ]; then
  echo "skip: authored by ${login:-<unknown>}, not Dependabot"
  exit 0
fi

# Dependabot's title is the version source of truth:
# "Bump astro from 7.1.3 to 7.1.6 in /site". Anything that doesn't match that
# shape — notably a grouped "Bump the lighthouse-ci group with 3 updates" —
# is left for a human on purpose, as is any major bump. Only a same-major
# patch/minor bump merges itself.
versions=$(sed -n 's/^Bump .* from \([0-9][^ ]*\) to \([0-9][^ ]*\).*/\1 \2/p' <<<"$title")
if [ -z "$versions" ]; then
  echo "skip: no single from/to pair in \"$title\""
  exit 0
fi

from=${versions%% *}
to=${versions##* }
if [ "${from%%.*}" != "${to%%.*}" ]; then
  echo "skip: major bump $from -> $to"
  exit 0
fi

echo "merge"
