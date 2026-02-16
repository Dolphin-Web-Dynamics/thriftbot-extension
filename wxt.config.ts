import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Thriftbot Crosslister',
    description: 'Auto-fill listing forms on resale marketplaces from your Thriftbot inventory',
    permissions: ['activeTab', 'storage', 'downloads', 'scripting'],
    host_permissions: [
      'https://thriftbot.smelltherosessecondhand.com/*',
      'https://web.vendoo.co/*',
    ],
  },
});
