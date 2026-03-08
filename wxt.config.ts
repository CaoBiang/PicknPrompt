import { defineConfig } from 'wxt';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  vite: () => ({
    plugins: [tsconfigPaths()],
  }),
  manifest: {
    name: 'PicknPrompt',
    description: '框选网页信息加入暂存区，并基于上下文发起 AI 对话。',
    permissions: ['storage', 'contextMenus', 'sidePanel', 'activeTab', 'scripting', 'downloads'],
    host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: '打开 PicknPrompt',
    },
  },
});
