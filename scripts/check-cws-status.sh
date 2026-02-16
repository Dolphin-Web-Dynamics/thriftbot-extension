#!/usr/bin/env bash
#
# Check Chrome Web Store item status before uploading.
#
# Fetches the current item state from the CWS API and reports it.
# Draft uploads work even during a pending review, but submitting
# for review will fail if a review is already pending — that must
# be cancelled manually in the CWS Developer Dashboard.
#
# Required env vars:
#   CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN, CHROME_EXTENSION_ID

set -euo pipefail

# Load .env.submit if running locally (CI sets env vars directly)
if [ -f ".env.submit" ]; then
  set -a
  source .env.submit
  set +a
fi

: "${CHROME_CLIENT_ID:?Missing CHROME_CLIENT_ID}"
: "${CHROME_CLIENT_SECRET:?Missing CHROME_CLIENT_SECRET}"
: "${CHROME_REFRESH_TOKEN:?Missing CHROME_REFRESH_TOKEN}"
: "${CHROME_EXTENSION_ID:?Missing CHROME_EXTENSION_ID}"

CWS_API="https://www.googleapis.com/chromewebstore/v1.1"

# --- Get OAuth access token ---
echo "Obtaining OAuth access token..."
TOKEN_RESPONSE=$(curl -sf -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id=${CHROME_CLIENT_ID}" \
  -d "client_secret=${CHROME_CLIENT_SECRET}" \
  -d "refresh_token=${CHROME_REFRESH_TOKEN}" \
  -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "::error::Failed to obtain access token"
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo "Access token obtained."

# --- Fetch item status ---
echo "Checking CWS item status for ${CHROME_EXTENSION_ID}..."
STATUS_RESPONSE=$(curl -sf \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-api-version: 2" \
  "${CWS_API}/items/${CHROME_EXTENSION_ID}?projection=DRAFT")

UPLOAD_STATE=$(echo "$STATUS_RESPONSE" | jq -r '.uploadState // empty')
CRX_VERSION=$(echo "$STATUS_RESPONSE" | jq -r '.crxVersion // empty')

echo "Upload state:       ${UPLOAD_STATE:-unknown}"
echo "Published version:  ${CRX_VERSION:-unknown}"

# Note: The CWS v1.1 API does not expose whether a review is pending.
# That status is only visible in the Developer Dashboard:
#   https://chrome.google.com/webstore/devconsole
#
# Draft uploads (--chrome-skip-submit-review) always succeed.
# Submit-for-review fails if a review is already pending — cancel it
# manually in the Dashboard before retrying.

if [ "$UPLOAD_STATE" = "IN_PROGRESS" ]; then
  echo ""
  echo "::warning::A draft upload is currently IN_PROGRESS."
  echo "This may cause the next upload to fail. Wait a moment and retry."
fi

echo "Status check complete."
