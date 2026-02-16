import './style.css';
import { fetchVendooReadyItems, markAsListed } from '@/lib/api';
import type { ThriftbotItem, FillFormMessage, FillResultMessage } from '@/lib/types';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Render the initial UI
app.innerHTML = `
  <div class="header">
    <h1>Thriftbot</h1>
    <span class="badge">Crosslister</span>
  </div>
  <button class="settings-toggle" id="settings-toggle">Settings</button>
  <div class="settings-panel" id="settings-panel">
    <label for="thriftbot-url">Thriftbot URL</label>
    <input id="thriftbot-url" type="url" placeholder="https://thriftbot.smelltherosessecondhand.com" />
    <label for="api-token">API Token (Admin Password)</label>
    <input id="api-token" type="password" placeholder="Your admin password" />
    <button class="save-btn" id="save-settings">Save</button>
  </div>
  <div id="content">
    <div class="state-msg"><span class="spinner"></span> Loading items...</div>
  </div>
`;

// Settings toggle
const settingsToggle = document.getElementById('settings-toggle')!;
const settingsPanel = document.getElementById('settings-panel')!;
const urlInput = document.getElementById('thriftbot-url') as HTMLInputElement;
const tokenInput = document.getElementById('api-token') as HTMLInputElement;
const saveBtn = document.getElementById('save-settings')!;

settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('visible');
});

// Load saved settings
(async () => {
  const savedUrl = await storage.getItem<string>('local:thriftbotUrl');
  const savedToken = await storage.getItem<string>('local:apiToken');
  if (savedUrl) urlInput.value = savedUrl;
  if (savedToken) tokenInput.value = savedToken;
})();

saveBtn.addEventListener('click', async () => {
  await storage.setItem('local:thriftbotUrl', urlInput.value || null);
  await storage.setItem('local:apiToken', tokenInput.value || null);
  settingsPanel.classList.remove('visible');
  loadItems();
});

// Check if current tab is on Vendoo
async function isOnVendooNewItem(): Promise<boolean> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab?.url?.includes('web.vendoo.co/app/item/new') ?? false;
  } catch {
    return false;
  }
}

// Load and render items
async function loadItems() {
  const content = document.getElementById('content')!;
  content.innerHTML = '<div class="state-msg"><span class="spinner"></span> Loading items...</div>';

  try {
    const items = await fetchVendooReadyItems();
    const onVendoo = await isOnVendooNewItem();

    if (items.length === 0) {
      content.innerHTML = '<div class="state-msg">All items are listed on Vendoo!</div>';
      return;
    }

    let html = '';

    if (!onVendoo) {
      html += `
        <div class="vendoo-warning">
          Open <a href="https://web.vendoo.co/app/item/new?marketplace=general" target="_blank">Vendoo New Item</a> first, then click Fill.
        </div>
      `;
    }

    html += '<div class="item-list">';
    for (const item of items) {
      html += renderItemCard(item, onVendoo);
    }
    html += '</div>';

    content.innerHTML = html;

    // Attach click handlers
    for (const item of items) {
      const btn = document.getElementById(`fill-btn-${item.id}`);
      btn?.addEventListener('click', () => handleFill(item, btn as HTMLButtonElement));
    }
  } catch (err: any) {
    if (err.message === 'unauthorized') {
      content.innerHTML = `
        <div class="state-msg">
          Not logged in.<br/>
          <a href="https://thriftbot.smelltherosessecondhand.com" target="_blank">Log into Thriftbot</a> or set your API token in Settings.
        </div>
      `;
    } else {
      content.innerHTML = `<div class="error-msg">Error: ${err.message}</div>`;
    }
  }
}

function renderItemCard(item: ThriftbotItem, onVendoo: boolean): string {
  const price = item.price ? `$${item.price.toFixed(2)}` : '';
  const brand = item.brand || '';
  return `
    <div class="item-card">
      <div class="item-info">
        <div class="item-sku">${item.sku}</div>
        <div class="item-title">${item.title || 'Untitled'}</div>
        <div class="item-meta">
          <span>${brand}</span>
          <span>${price}</span>
        </div>
      </div>
      <button class="fill-btn" id="fill-btn-${item.id}" ${!onVendoo ? 'disabled' : ''}>
        Fill Form
      </button>
    </div>
  `;
}

async function handleFill(item: ThriftbotItem, btn: HTMLButtonElement) {
  btn.disabled = true;
  btn.textContent = 'Filling...';

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    // Ensure content script is injected (handles SPA navigation)
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      });
    } catch {
      // Script may already be injected or tab may not be injectable
    }

    // Send item data to the content script
    const message: FillFormMessage = { type: 'FILL_VENDOO_FORM', item };
    const result = await browser.tabs.sendMessage(tab.id, message) as FillResultMessage;

    if (result?.success) {
      btn.classList.add('success');
      btn.textContent = 'Mark Listed';
      btn.disabled = false;

      // Replace click handler: next click marks as listed
      const newBtn = btn.cloneNode(true) as HTMLButtonElement;
      btn.replaceWith(newBtn);
      newBtn.addEventListener('click', () => handleMarkListed(item, newBtn));
    } else {
      btn.textContent = 'Error';
      btn.classList.add('error');
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Fill Form';
        btn.classList.remove('error');
      }, 3000);
    }
  } catch (err: any) {
    console.error('Fill error:', err);
    btn.textContent = 'Error';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Fill Form';
    }, 3000);
  }
}

async function handleMarkListed(item: ThriftbotItem, btn: HTMLButtonElement) {
  btn.disabled = true;
  btn.textContent = 'Marking...';

  try {
    await markAsListed(item.id);
    btn.textContent = 'Listed!';
    btn.classList.remove('success');
    btn.classList.add('listed');
    btn.disabled = true;
  } catch (err: any) {
    console.error('Mark listed error:', err);
    btn.textContent = 'Mark Listed';
    btn.disabled = false;
  }
}

// Initial load
loadItems();
