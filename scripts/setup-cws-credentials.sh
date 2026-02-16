#!/usr/bin/env bash
set -euo pipefail

# Chrome Web Store API Credential Setup
# Based on: https://developer.chrome.com/docs/webstore/using-api

ENV_FILE=".env.submit"
OAUTH_SCOPE="https://www.googleapis.com/auth/chromewebstore"
TOKEN_URI="https://oauth2.googleapis.com/token"

echo "============================================"
echo " Chrome Web Store API — Credential Setup"
echo "============================================"
echo ""
echo "This script will walk you through setting up"
echo "OAuth credentials for the Chrome Web Store API."
echo ""

# ── Step 1: Google Cloud project ──────────────────────────────────────
echo "── Step 1: Enable the Chrome Web Store API ──"
echo ""
echo "1. Open Google Cloud Console:"
echo "   https://console.cloud.google.com/"
echo ""
echo "2. Create a new project (or select an existing one)."
echo ""
echo "3. Enable the Chrome Web Store API:"
echo "   https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com"
echo ""
read -rp "Press Enter when done..."
echo ""

# ── Step 2: OAuth consent screen ──────────────────────────────────────
echo "── Step 2: Configure OAuth Consent Screen ──"
echo ""
echo "1. Go to the OAuth consent screen:"
echo "   https://console.cloud.google.com/apis/credentials/consent"
echo ""
echo "2. Select 'External' user type → Create."
echo "3. Fill in:"
echo "   - App name: Thriftbot Extension Publisher"
echo "   - User support email: your email"
echo "   - Developer contact: your email"
echo "4. Skip Scopes → click 'Save and Continue'."
echo "5. Add yourself as a Test User → Save."
echo ""
read -rp "Press Enter when done..."
echo ""

# ── Step 3: Create OAuth client ───────────────────────────────────────
echo "── Step 3: Create OAuth Client ID ──"
echo ""
echo "1. Go to Credentials:"
echo "   https://console.cloud.google.com/apis/credentials"
echo ""
echo "2. Click 'Create Credentials' → 'OAuth client ID'."
echo "3. Application type: 'Web application'."
echo "4. Name: 'CWS Publisher'."
echo "5. Under 'Authorized redirect URIs', add:"
echo "   https://developers.google.com/oauthplayground"
echo "6. Click Create and copy the Client ID and Secret."
echo ""

read -rp "Paste your Client ID: " CLIENT_ID
read -rp "Paste your Client Secret: " CLIENT_SECRET
echo ""

# ── Step 4: Get refresh token via OAuth Playground ────────────────────
echo "── Step 4: Get Refresh Token ──"
echo ""
echo "1. Open the OAuth Playground:"
echo "   https://developers.google.com/oauthplayground"
echo ""
echo "2. Click the gear icon (⚙) in the top-right."
echo "3. Check 'Use your own OAuth credentials'."
echo "4. Enter your Client ID and Client Secret."
echo "5. In the left panel, scroll to 'Chrome Web Store API v2'"
echo "   or type this scope manually:"
echo "   ${OAUTH_SCOPE}"
echo "6. Click 'Authorize APIs' → sign in → allow access."
echo "7. Click 'Exchange authorization code for tokens'."
echo "8. Copy the Refresh Token from the response."
echo ""

read -rp "Paste your Refresh Token: " REFRESH_TOKEN
echo ""

# ── Step 5: Extension ID ─────────────────────────────────────────────
echo "── Step 5: Extension ID ──"
echo ""
echo "If you've already uploaded your extension to the"
echo "Chrome Web Store, enter the Extension ID."
echo ""
echo "Find it at: https://chrome.google.com/webstore/devconsole"
echo "(It's the long string in the URL when editing your item.)"
echo ""
echo "If you haven't uploaded yet, leave this blank and"
echo "update .env.submit after your first manual upload."
echo ""

read -rp "Extension ID (or press Enter to skip): " EXTENSION_ID
echo ""

# ── Step 6: Verify credentials ───────────────────────────────────────
echo "── Verifying credentials... ──"
echo ""

ACCESS_TOKEN_RESPONSE=$(curl -s "${TOKEN_URI}" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "refresh_token=${REFRESH_TOKEN}" \
  -d "grant_type=refresh_token")

if echo "${ACCESS_TOKEN_RESPONSE}" | grep -q "access_token"; then
  echo "Credentials verified successfully!"
else
  echo "WARNING: Could not verify credentials."
  echo "Response: ${ACCESS_TOKEN_RESPONSE}"
  echo ""
  echo "The credentials will still be saved. You can fix them"
  echo "later by editing ${ENV_FILE} or re-running this script."
fi
echo ""

# ── Step 7: Write .env.submit ─────────────────────────────────────────
cat > "${ENV_FILE}" <<EOF
CHROME_EXTENSION_ID=${EXTENSION_ID}
CHROME_CLIENT_ID=${CLIENT_ID}
CHROME_CLIENT_SECRET=${CLIENT_SECRET}
CHROME_REFRESH_TOKEN=${REFRESH_TOKEN}
EOF

echo "── Done! ──"
echo ""
echo "Credentials saved to ${ENV_FILE}"
echo ""
echo "Next steps:"
echo "  npm run zip                  # Build the extension zip"
echo "  npm run submit:dry-run       # Test the submission"
echo "  npm run submit               # Submit to Chrome Web Store"
echo ""
if [ -z "${EXTENSION_ID}" ]; then
  echo "NOTE: You still need to set CHROME_EXTENSION_ID in ${ENV_FILE}"
  echo "after your first upload to the Developer Dashboard."
  echo ""
fi
