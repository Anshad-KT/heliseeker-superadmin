#!/bin/bash

set -euo pipefail

VERCEL_DEV_PROJECT="heliseeker-admin-dev"
VERCEL_PROD_PROJECT="heli-seeker-superadmin"
VERCEL_SCOPE="heli-seekers-projects"

SOURCE_DIR="$(pwd)"
DEPLOY_DIR="$(mktemp -d "${TMPDIR:-/tmp}/vercel-deploy-XXXXXX")"

to_windows_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s\n' "$1"
  fi
}

SOURCE_COPY_PATH="$(to_windows_path "$SOURCE_DIR")"
DEPLOY_COPY_PATH="$(to_windows_path "$DEPLOY_DIR")"

VERCEL_SCOPE_ARGS=()
if [ -n "$VERCEL_SCOPE" ]; then
  VERCEL_SCOPE_ARGS=(--scope "$VERCEL_SCOPE")
fi

deploy_to_project() {
  local project="$1"
  local label="$2"

  echo "Linking temporary directory to $label Vercel project: $project"
  vercel link --yes --project "$project" "${VERCEL_SCOPE_ARGS[@]}"

  echo "Deploying $label from temporary directory..."
  vercel deploy --prod "${VERCEL_SCOPE_ARGS[@]}"
}

echo "Creating temporary deployment copy..."
echo "Source: $SOURCE_DIR"
echo "Temp: $DEPLOY_DIR"

set +e
MSYS_NO_PATHCONV=1 robocopy "$SOURCE_COPY_PATH" "$DEPLOY_COPY_PATH" /MIR \
  /XD .git .next .vercel node_modules .pnpm-store out dist build coverage .turbo .vscode \
  /XF .env .env.* *.env *.env.* *.local *.tsbuildinfo npm-debug.log* yarn-debug.log* yarn-error.log* pnpm-debug.log* dev-server.err.log dev-server.out.log \
  /NFL /NDL /NJH /NJS /NP
ROBOCOPY_EXIT=$?
set -e

if [ "$ROBOCOPY_EXIT" -ge 8 ]; then
  echo "Robocopy failed with exit code $ROBOCOPY_EXIT."
  exit "$ROBOCOPY_EXIT"
fi

cd "$DEPLOY_DIR"

deploy_to_project "$VERCEL_DEV_PROJECT" "dev"
deploy_to_project "$VERCEL_PROD_PROJECT" "production"

cd "$SOURCE_DIR"
git stage "."
git pull origin main
git commit "." -m "fix: latest fix"
git push origin main