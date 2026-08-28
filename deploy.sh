#!/usr/bin/env bash
# Build the site and sync it to the Sered (cPanel) host.
#
#   ./deploy.sh --dry-run    show what would change, transfer nothing
#   ./deploy.sh              build + upload
#
# Config lives in .env.deploy (gitignored). See .env.deploy.example.

set -euo pipefail
cd "$(dirname "$0")"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -f .env.deploy ]]; then
  echo "Missing .env.deploy — copy .env.deploy.example to .env.deploy and fill it in." >&2
  exit 1
fi
set -a; source .env.deploy; set +a

: "${DEPLOY_METHOD:?set DEPLOY_METHOD to ssh or ftp in .env.deploy}"
: "${DEPLOY_HOST:?set DEPLOY_HOST in .env.deploy}"
: "${DEPLOY_USER:?set DEPLOY_USER in .env.deploy}"
: "${DEPLOY_REMOTE_PATH:=/public_html/}"
: "${DEPLOY_DELETE:=false}"

STAGE=.deploy-stage

echo "==> Building"
npm run build

echo "==> Staging"
# Only what belongs on the server ends up here, so .env.local, upload.zip,
# node_modules and the unbuilt sources can never be uploaded by accident.
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R dist/. "$STAGE"/
# events-api.php/secrets.php only exist on branches with the PHP Eventbrite
# proxy; the editorial redesign links to Eventbrite directly and has neither.
[[ -f events-api.php ]] && cp events-api.php "$STAGE"/
[[ -f secrets.php ]] && cp secrets.php "$STAGE"/
# .htaccess comes from public/.htaccess via the Vite build (already in dist/);
# do not overwrite it with the legacy root-level htaccess file.

DELETE_FLAG=()
LFTP_DELETE=""
if [[ "$DEPLOY_DELETE" == "true" ]]; then
  DELETE_FLAG=(--delete)
  LFTP_DELETE="--delete"
fi

case "$DEPLOY_METHOD" in
  ssh)
    : "${DEPLOY_PORT:=22}"
    SSH_CMD="ssh -p ${DEPLOY_PORT}"
    [[ -n "${DEPLOY_SSH_KEY:-}" ]] && SSH_CMD="$SSH_CMD -i ${DEPLOY_SSH_KEY}"
    RSYNC_FLAGS=(-az --human-readable --progress "${DELETE_FLAG[@]}")
    $DRY_RUN && RSYNC_FLAGS+=(--dry-run)
    echo "==> rsync -> ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_REMOTE_PATH}"
    rsync "${RSYNC_FLAGS[@]}" \
      -e "$SSH_CMD" \
      "$STAGE"/ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_REMOTE_PATH}"
    ;;

  ftp)
    : "${DEPLOY_PASS:?set DEPLOY_PASS in .env.deploy}"
    : "${DEPLOY_PORT:=21}"
    command -v lftp >/dev/null || { echo "lftp not installed: brew install lftp" >&2; exit 1; }
    # No --verbose: lftp's mirror -v echoes every sub-operation (get/mkdir/chmod)
    # as a full ftp://user:pass@host/... URL, which would print the password in
    # plain text. Keep this quiet; the redaction filter below is a second,
    # belt-and-suspenders layer in case any lftp version prints the URL anyway.
    MIRROR_FLAGS="--reverse --continue --parallel=4 $LFTP_DELETE"
    $DRY_RUN && MIRROR_FLAGS="$MIRROR_FLAGS --dry-run"
    echo "==> lftp -> ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_REMOTE_PATH}"
    lftp -c "
      set ftp:ssl-force true;
      set ftp:ssl-protect-data true;
      set ssl:verify-certificate true;
      open -p ${DEPLOY_PORT} -u '${DEPLOY_USER}','${DEPLOY_PASS}' '${DEPLOY_HOST}';
      mirror $MIRROR_FLAGS '$STAGE/' '${DEPLOY_REMOTE_PATH}';
    " 2>&1 | sed "s/${DEPLOY_PASS}/[REDACTED]/g; s/$(python3 -c "import urllib.parse,os;print(urllib.parse.quote(os.environ['DEPLOY_PASS'],safe=''))" 2>/dev/null || true)/[REDACTED]/g"
    ;;

  *)
    echo "DEPLOY_METHOD must be 'ssh' or 'ftp', got '${DEPLOY_METHOD}'" >&2
    exit 1
    ;;
esac

$DRY_RUN && echo "==> Dry run complete, nothing was uploaded." || echo "==> Deployed."
