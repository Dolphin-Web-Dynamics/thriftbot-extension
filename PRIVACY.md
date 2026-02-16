# Privacy Policy

**Thriftbot → Vendoo Chrome Extension**
Dolphin Web Dynamics, LLC
Last updated: February 15, 2026

## Overview

The Thriftbot → Vendoo extension auto-fills Vendoo listing forms using data from your Thriftbot inventory. This policy explains what data the extension accesses, how it is used, and how it is stored.

## Data Collection and Use

### Data the extension accesses

- **Thriftbot inventory data** — The extension fetches your item listings (title, description, price, SKU, images, etc.) from your Thriftbot server to populate Vendoo forms.
- **API token** — If you provide an API token in the extension settings, it is stored locally in your browser and used solely to authenticate requests to your Thriftbot server.
- **Thriftbot server URL** — If you customize the server URL in settings, it is stored locally in your browser.

### Data the extension does NOT collect

- No personally identifiable information (name, email, address)
- No browsing history or web activity
- No financial or payment information
- No health or location data
- No analytics or telemetry

## Data Storage

All user settings (API token and server URL) are stored **locally in your browser** using the browser's built-in storage API. No data is stored on external servers controlled by Dolphin Web Dynamics, LLC.

## Data Sharing

We do **not** sell, transfer, or share any user data with third parties. Data flows only between your browser, your Thriftbot server, and the Vendoo website — all initiated by your direct action.

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Detect if the current tab is on Vendoo's new item page before enabling form fill |
| `storage` | Save your Thriftbot server URL and API token locally |
| `downloads` | Download product images from your Thriftbot inventory to a local folder |
| Host access to `thriftbot.smelltherosessecondhand.com` | Fetch your inventory items from the Thriftbot API |
| Host access to `web.vendoo.co` | Inject the content script that fills Vendoo's listing form |

## Remote Code

This extension does not use any remote code. All JavaScript is bundled within the extension package.

## Changes to This Policy

If this policy is updated, the changes will be posted here with an updated date. Continued use of the extension after changes constitutes acceptance.

## Contact

For questions about this privacy policy, open an issue at:
https://github.com/Dolphin-Web-Dynamics/thriftbot-extension/issues
