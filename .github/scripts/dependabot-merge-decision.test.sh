#!/usr/bin/env bash
# Self-check for dependabot-merge-decision.sh. Run it directly: no framework,
# no fixtures. Every case here is a real Dependabot title from this repo's
# own pull request history.
set -euo pipefail
cd "$(dirname "$0")"

fail=0
check() {
  local expected=$1 login=$2 title=$3
  local got
  got=$(./dependabot-merge-decision.sh "$login" "$title")
  if [[ "$got" != "$expected"* ]]; then
    echo "FAIL: \"$title\" -> \"$got\" (wanted \"$expected\")"
    fail=1
  fi
}

check merge  app/dependabot "Bump astro from 7.1.3 to 7.1.6 in /site"
check merge  app/dependabot "Bump @types/three from 0.185.1 to 0.185.4 in /site"
check merge  app/dependabot "Bump @playwright/test from 1.62.0 to 1.62.1 in /site"
check merge  app/dependabot "Bump @storybook-astro/framework from 1.9.0 to 1.10.0 in /site"
check merge  dependabot[bot] "Bump storybook from 10.5.5 to 10.5.6 in /site"
# 0.x is treated by the same rule as any other major: 0.185 -> 0.186 stays a
# minor here, which matches how the caret ranges in site/package.json resolve.
check merge  app/dependabot "Bump three from 0.185.1 to 0.186.0 in /site"

check skip   app/dependabot "Bump actions/cache from 4 to 6"
check skip   app/dependabot "Bump actions/setup-python from 6 to 7"
check skip   app/dependabot "Bump astro from 7.1.3 to 8.0.0 in /site"
check skip   app/dependabot "Bump the lighthouse-ci group with 3 updates"
check skip   jthiruveedula "Bump astro from 7.1.3 to 7.1.6 in /site"

if [ "$fail" -eq 0 ]; then
  echo "dependabot-merge-decision: all cases pass"
else
  exit 1
fi
