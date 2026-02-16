import type { FillFormMessage, FillResultMessage, ThriftbotItem } from '@/lib/types';

// Condition mapping: Thriftbot enum → Vendoo dropdown label
const CONDITION_MAP: Record<string, string> = {
  new_with_tags: 'New with Tags',
  new_without_tags: 'New without Tags',
  excellent: 'Excellent / Like New',
  good: 'Good',
  fair: 'Fair',
};

export default defineContentScript({
  matches: ['https://web.vendoo.co/app/item/new*'],

  main() {
    // Listen for messages from the popup
    browser.runtime.onMessage.addListener(
      (message: FillFormMessage, _sender, sendResponse) => {
        if (message.type === 'FILL_VENDOO_FORM') {
          fillVendooForm(message.item)
            .then(() => {
              const result: FillResultMessage = {
                type: 'FILL_RESULT',
                success: true,
                itemId: message.item.id,
              };
              sendResponse(result);
            })
            .catch((err) => {
              const result: FillResultMessage = {
                type: 'FILL_RESULT',
                success: false,
                itemId: message.item.id,
                error: err.message,
              };
              sendResponse(result);
            });
          return true; // Keep the message channel open for async response
        }
      }
    );
  },
});

// --- React-compatible input setter ---

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const descriptor =
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// --- Field Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fillTextField(testId: string, value: string | number | null | undefined) {
  if (value == null || value === '' || value === 0) return;

  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[data-testid="${testId}"]`
  );
  if (!el) {
    console.warn(`[Thriftbot] Field not found: ${testId}`);
    return;
  }

  el.focus();
  el.click();
  setNativeValue(el, String(value));
  el.blur();
}

async function fillDropdown(ariaLabel: string, value: string | null | undefined) {
  if (!value) return;

  const el = document.querySelector<HTMLInputElement>(`[aria-label="${ariaLabel}"]`);
  if (!el) {
    console.warn(`[Thriftbot] Dropdown not found: ${ariaLabel}`);
    return;
  }

  // Click to open
  el.focus();
  el.click();
  await sleep(200);

  // Type the value
  setNativeValue(el, value);
  await sleep(500);

  // Try to find and click the matching option
  const options = document.querySelectorAll('[class*="option"]');
  let found = false;
  for (const opt of options) {
    if (opt.textContent?.trim().toLowerCase().includes(value.toLowerCase())) {
      (opt as HTMLElement).click();
      found = true;
      break;
    }
  }

  if (!found) {
    // Press Enter to accept typed value
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(100);
  }

  await sleep(200);
}

async function fillTags(tags: string | null | undefined) {
  if (!tags) return;

  const container = document.querySelector('[data-testid="generalDetails.tags-multi-selector-container"]');
  if (!container) {
    console.warn('[Thriftbot] Tags container not found');
    return;
  }

  const input = container.querySelector<HTMLInputElement>('input');
  if (!input) return;

  const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

  for (const tag of tagList) {
    input.focus();
    setNativeValue(input, tag);
    await sleep(200);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(200);
  }
}

// --- Main Form Filler ---

async function fillVendooForm(item: ThriftbotItem) {
  console.log('[Thriftbot] Filling form for:', item.sku, item.title);

  // Simple text fields
  await fillTextField('generalDetails.title', item.title);
  await fillTextField('generalDetails.description', item.description);
  await fillTextField('generalDetails.price', item.price);
  await fillTextField('generalDetails.cost', item.cost);
  await fillTextField('generalDetails.sku', item.sku);
  await fillTextField('generalDetails.quantity', 1);
  await fillTextField('generalDetails.zipCode', item.zip_code);

  // Weight conversion (lbs → pounds + ounces)
  if (item.weight_lbs) {
    const pounds = Math.floor(item.weight_lbs);
    const ounces = Math.round((item.weight_lbs - pounds) * 16);
    await fillTextField('generalDetails.weight.pounds', pounds);
    await fillTextField('generalDetails.weight.ounces', ounces);
  }

  // Dimensions
  await fillTextField('generalDetails.dimensions.length', item.length);
  await fillTextField('generalDetails.dimensions.width', item.width);
  await fillTextField('generalDetails.dimensions.height', item.height);

  // Dropdowns (need delays between each for React to process)
  await fillDropdown('Brand', item.brand);
  await sleep(300);
  await fillDropdown('Category Selector for vendoo', item.category);
  await sleep(300);
  await fillDropdown('Condition', CONDITION_MAP[item.condition || ''] || item.condition);
  await sleep(300);

  // Colors
  if (item.colors) {
    const colors = item.colors.split(',').map((c) => c.trim());
    await fillDropdown('Primary Color', colors[0]);
    await sleep(300);
    if (colors[1]) {
      await fillDropdown('Secondary Color', colors[1]);
      await sleep(300);
    }
  }

  // Size
  await fillDropdown('US Size', item.size);
  await sleep(300);

  // Tags
  await fillTags(item.tags);

  // Notes
  await fillTextField('generalDetails.notes', item.notes);

  console.log('[Thriftbot] Form fill complete for:', item.sku);
}
