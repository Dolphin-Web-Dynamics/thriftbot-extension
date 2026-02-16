import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Thriftbot → Vendoo',
    description: 'Auto-fill Vendoo listing forms from your Thriftbot inventory',
    permissions: ['activeTab', 'storage', 'downloads'],
    host_permissions: [
      'https://thriftbot.smelltherosessecondhand.com/*',
      'https://web.vendoo.co/*',
    ],
  },
});
