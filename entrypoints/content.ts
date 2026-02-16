import type { FillFormMessage, FillResultMessage, ThriftbotItem } from '@/lib/types';

// Condition mapping: Thriftbot enum → Vendoo dropdown label
const CONDITION_MAP: Record<string, string> = {
  new_with_tags: 'New with Tags',
  new_without_tags: 'New without Tags',
  excellent: 'Excellent / Like New',
  good: 'Good',
  fair: 'Fair',
};

// Gender mapping: Thriftbot enum → Vendoo dropdown label
const GENDER_MAP: Record<string, string> = {
  mens: 'Men',
  womens: 'Women',
  unisex: 'Unisex',
};

export default defineContentScript({
  matches: ['https://web.vendoo.co/app/item/new*'],

  main() {
    // Prevent duplicate listeners when script is re-injected programmatically
    if (document.documentElement.dataset.thriftbotLoaded) return;
    document.documentElement.dataset.thriftbotLoaded = 'true';

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

async function fillTextField(fieldId: string, value: string | number | null | undefined) {
  if (value == null || value === '' || value === 0) return;

  // Try data-testid first, then name, then id
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[data-testid="${fieldId}"]`
  ) || document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[name="${fieldId}"]`
  ) || document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `#${CSS.escape(fieldId)}`
  );
  if (!el) {
    console.warn(`[Thriftbot] Field not found: ${fieldId}`);
    return;
  }

  el.focus();
  el.click();
  setNativeValue(el, String(value));
  el.blur();
}

async function fillDescription(value: string | null | undefined) {
  if (!value) return;

  const el = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
    '#generalDetails\\.description'
  ) || document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
    '[name="generalDetails.description"]'
  ) || document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
    'textarea[name*="description" i]'
  );

  if (el) {
    console.log(`[Thriftbot] Description element found: <${el.tagName.toLowerCase()}> name="${el.name}" type="${el.type}"`);

    el.focus();
    el.click();
    await sleep(100);

    // Use the specific prototype setter for this element type
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }

    // Fire all events React might listen to
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));

    // Also try triggering React's internal handler via the fiber
    const reactKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (reactKey) {
      const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
      if (propsKey) {
        const props = (el as any)[propsKey];
        if (props?.onChange) {
          props.onChange({ target: el, currentTarget: el });
          console.log('[Thriftbot] Description: triggered React onChange via fiber');
        }
      }
    }

    console.log('[Thriftbot] Description filled');
    return;
  }

  // Try contenteditable editors as fallback
  const editor = document.querySelector<HTMLElement>(
    '[aria-label="Description"] [contenteditable="true"]'
  ) || document.querySelector<HTMLElement>(
    '.DraftEditor-root [contenteditable="true"]'
  ) || document.querySelector<HTMLElement>(
    '[data-slate-editor="true"]'
  ) || document.querySelector<HTMLElement>(
    '.ProseMirror[contenteditable="true"]'
  );

  if (editor) {
    console.log('[Thriftbot] Description found via contenteditable');
    editor.focus();
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, value);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  console.warn('[Thriftbot] Description field not found');
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
  await fillDescription(item.description);
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

  // Images
  if (item.image_urls?.length) {
    await uploadImages(item.image_urls);
  }

  console.log('[Thriftbot] Form fill complete for:', item.sku);
}

async function uploadImages(urls: string[]) {
  const fileInput = document.querySelector<HTMLInputElement>('#imageInput');
  if (!fileInput) {
    console.warn('[Thriftbot] Image input not found');
    return;
  }

  const files: File[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const response = await fetch(urls[i]);
      const blob = await response.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `image-${i + 1}.${ext}`, { type: blob.type });
      files.push(file);
    } catch (err) {
      console.warn(`[Thriftbot] Failed to fetch image ${i + 1}:`, err);
    }
  }

  if (files.length === 0) return;

  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }

  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  console.log(`[Thriftbot] Uploaded ${files.length} images`);
}
