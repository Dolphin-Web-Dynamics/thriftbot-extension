import type { DownloadImagesMessage } from '@/lib/types';

export default defineBackground(() => {
  console.log('[Thriftbot] Background service worker started');

  // Handle image download requests from the popup
  browser.runtime.onMessage.addListener(
    (message: DownloadImagesMessage, _sender, sendResponse) => {
      if (message.type === 'DOWNLOAD_IMAGES') {
        downloadImages(message.imageUrls, message.sku)
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async
      }
    }
  );
});

async function downloadImages(urls: string[], sku: string) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const ext = url.match(/\.(jpe?g|png|heic|heif)/i)?.[0] || '.jpg';
    const filename = `thriftbot-${sku}-${i + 1}${ext}`;

    try {
      await browser.downloads.download({
        url,
        filename: `thriftbot-vendoo/${filename}`,
        saveAs: false,
      });
    } catch (err) {
      console.warn(`[Thriftbot] Failed to download image ${i + 1}:`, err);
    }
  }
}
