import { defineBackground } from 'wxt/utils/define-background';

import { rebuildContextMenus, handleContextMenuClick, handleRuntimeMessage } from '../src/background/core';
import { ensureBootstrapData } from '../src/shared/storage/bootstrap';
import type { RuntimeMessage } from '../src/shared/types';

export default defineBackground(() => {
  const bootstrap = async () => {
    await ensureBootstrapData();
    await rebuildContextMenus();
    await chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
  };

  void bootstrap();
  chrome.runtime.onInstalled.addListener(() => void bootstrap());
  chrome.runtime.onStartup?.addListener(() => void bootstrap());
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    void handleContextMenuClick(info, tab);
  });
  chrome.action?.onClicked?.addListener((tab) => {
    if (tab.windowId && chrome.sidePanel?.open) {
      void chrome.sidePanel.open({ windowId: tab.windowId });
    }
  });
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    void handleRuntimeMessage(message, sender).then(sendResponse);
    return true;
  });
});
