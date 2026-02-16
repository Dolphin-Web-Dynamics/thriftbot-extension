# Thriftbot → Vendoo Chrome Extension

Chrome extension that auto-fills [Vendoo](https://vendoo.co) listing forms with inventory data from your [Thriftbot](https://github.com/Dolphin-Web-Dynamics/thriftbot) instance. Built with [WXT](https://wxt.dev), a next-generation framework for building web extensions.

## How It Works

1. The extension fetches your "Vendoo-ready" items from the Thriftbot API
2. You navigate to Vendoo's new listing form
3. Click **Fill Form** on any item — the extension fills all fields (title, description, price, brand, category, condition, colors, size, weight, dimensions, tags, etc.)
4. Product images are downloaded to your `thriftbot-vendoo/` downloads folder for you to drag into Vendoo's image uploader
5. The item is automatically marked as listed in Thriftbot

## Prerequisites

- **Node.js** 20+ and **npm**
- A running Thriftbot instance with the API enabled (PR #10 or later)
- Your Thriftbot admin password (used as the API token)
- A [Vendoo](https://web.vendoo.co) account

## Getting Started

### 1. Clone and install

```bash
git clone git@github.com:Dolphin-Web-Dynamics/thriftbot-extension.git
cd thriftbot-extension
npm install
```

### 2. Run in development mode

```bash
npm run dev
```

This starts WXT in dev mode with hot-reload. It will output the built extension to `.output/chrome-mv3/`.

### 3. Load the extension in Chrome

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder inside this project
5. The extension icon should appear in your toolbar

### 4. Configure

1. Click the extension icon in Chrome's toolbar
2. Click **Settings**
3. Enter your Thriftbot URL (e.g. `https://thriftbot.smelltherosessecondhand.com`)
4. Enter your API Token (your Thriftbot admin password)
5. Click **Save**

### 5. Use it

1. Open [Vendoo's new listing form](https://web.vendoo.co/app/item/new?marketplace=general)
2. Click the extension icon — you'll see a list of items ready to be listed
3. Click **Fill Form** on any item
4. The form fields are auto-filled; drag images from your downloads folder if prompted
5. Review and submit the listing on Vendoo

## Development

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev mode with hot-reload (Chrome) |
| `npm run dev:firefox` | Start dev mode for Firefox |
| `npm run build` | Production build (Chrome) |
| `npm run build:firefox` | Production build (Firefox) |
| `npm run zip` | Build and create distributable .zip |
| `npm run compile` | TypeScript type-check (no emit) |

### Project structure

```
entrypoints/
  background.ts         # Service worker — handles image downloads
  content.ts            # Content script — fills Vendoo form fields
  popup/
    index.html          # Popup HTML shell
    main.ts             # Popup logic — fetches items, triggers fill
    style.css           # Popup styling
lib/
  api.ts                # Thriftbot API client (fetch items, mark listed)
  types.ts              # TypeScript interfaces
public/
  icon/                 # Extension icons (16–128px)
wxt.config.ts           # WXT / manifest configuration
```

### Architecture

The extension has three main parts that communicate via Chrome's messaging API:

- **Popup** (`entrypoints/popup/`) — The UI you see when clicking the extension icon. Fetches items from the Thriftbot API, renders cards, and triggers the fill/download flow.
- **Content script** (`entrypoints/content.ts`) — Injected into `web.vendoo.co/app/item/new*`. Receives item data from the popup and fills the Vendoo form fields using React-compatible input setters.
- **Background script** (`entrypoints/background.ts`) — Service worker that downloads product images to the local filesystem when triggered by the popup.

### Making changes

WXT dev mode hot-reloads most changes automatically. If you change `wxt.config.ts` or `manifest` settings, restart `npm run dev`. After loading the unpacked extension once, Chrome will pick up rebuilds automatically — just refresh the Vendoo page if the content script changed.

## Building for Distribution

```bash
npm run zip
```

This creates a `.zip` in `.output/` that can be uploaded to the Chrome Web Store or shared for manual installation.

## Credits

- Built with [WXT](https://wxt.dev) — a framework for building web extensions with TypeScript, hot-reload, and cross-browser support
- Part of the [Thriftbot](https://github.com/Dolphin-Web-Dynamics/thriftbot) ecosystem by [Dolphin Web Dynamics](https://github.com/Dolphin-Web-Dynamics)
