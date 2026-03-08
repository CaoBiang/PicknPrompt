import { DEFAULT_QUICK_CHAT_PROMPT, RUNTIME_MESSAGES } from '../shared/constants';
import { blobRepository, stashRepository, assistantRepository } from '../shared/repositories';
import { saveComposeDraft } from '../shared/storage/chrome-storage';
import type { DataChangedPayload, RuntimeMessage, StashItem } from '../shared/types';
import { blobToDataUrl } from '../shared/utils/base64';
import { createId } from '../shared/utils/id';
import { nowIso } from '../shared/utils/time';

const MENU_ADD_TO_STASH = 'picknprompt:add-to-stash';
const MENU_QUICK_ROOT = 'picknprompt:quick-root';
const QUICK_PREFIX = 'picknprompt:quick:';
const MAX_PREVIEW_BYTES = 1024 * 1024 * 2;

function emitDataChanged(payload: DataChangedPayload) {
  chrome.runtime.sendMessage({ type: RUNTIME_MESSAGES.dataChanged, payload }).catch?.(() => undefined);
}

async function openSidePanel(windowId?: number) {
  if (windowId && chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ windowId });
    return;
  }

  if (chrome.runtime.openOptionsPage) {
    await chrome.runtime.openOptionsPage();
  }
}

async function saveTextItem(text: string, sourceUrl: string, sourceTitle: string, capturedFrom: StashItem['captureMeta']['capturedFrom']) {
  const timestamp = nowIso();
  const item: StashItem = {
    id: createId('stash'),
    type: 'text',
    sourceUrl,
    sourceTitle,
    textContent: text,
    createdAt: timestamp,
    updatedAt: timestamp,
    captureMeta: { capturedFrom, pageSelection: text },
  };
  await stashRepository.save(item);
  emitDataChanged({ entity: 'stash', action: 'create' });
  return item;
}

async function saveImageItem(imageUrl: string, sourceUrl: string, sourceTitle: string, alt: string | undefined, capturedFrom: StashItem['captureMeta']['capturedFrom']) {
  const timestamp = nowIso();
  let blobKey: string | undefined;
  let previewUrl = imageUrl;
  let mimeType: string | undefined;
  let size: number | undefined;

  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      mimeType = blob.type;
      size = blob.size;
      blobKey = createId('blob');
      await blobRepository.save({ id: blobKey, blob, mimeType, createdAt: timestamp });
      if (blob.size <= MAX_PREVIEW_BYTES) {
        previewUrl = await blobToDataUrl(blob);
      }
    }
  } catch {
    blobKey = undefined;
  }

  const item: StashItem = {
    id: createId('stash'),
    type: 'image',
    sourceUrl,
    sourceTitle,
    blobKey,
    previewUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
    captureMeta: { capturedFrom, alt, mimeType, size },
  };
  await stashRepository.save(item);
  emitDataChanged({ entity: 'stash', action: 'create' });
  return item;
}

async function startQuickChat(message: Extract<RuntimeMessage, { type: 'START_QUICK_CHAT' }>, sender: chrome.runtime.MessageSender) {
  const item = message.payload.kind === 'text'
    ? await saveTextItem(message.payload.text || '', message.payload.sourceUrl, message.payload.sourceTitle, 'quick-assistant')
    : await saveImageItem(message.payload.imageUrl || '', message.payload.sourceUrl, message.payload.sourceTitle, message.payload.alt, 'quick-assistant');

  await saveComposeDraft({
    selectedStashIds: [item.id],
    assistantId: message.payload.assistantId,
    modelConfigId: undefined,
    pendingAutoSend: true,
    seedUserPrompt: DEFAULT_QUICK_CHAT_PROMPT,
    source: 'quick-assistant',
  });

  await openSidePanel(sender.tab?.windowId);
}

export async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ADD_TO_STASH, title: '加入 PicknPrompt 暂存区', contexts: ['selection', 'image'] });

  const quickAssistants = (await assistantRepository.list()).filter((item) => item.isQuickAssistant);
  if (!quickAssistants.length) return;

  chrome.contextMenus.create({ id: MENU_QUICK_ROOT, title: '用快捷助手开始对话', contexts: ['selection', 'image'] });
  quickAssistants.forEach((assistant) => {
    chrome.contextMenus.create({ id: `${QUICK_PREFIX}${assistant.id}`, parentId: MENU_QUICK_ROOT, title: assistant.name, contexts: ['selection', 'image'] });
  });
}

export async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  const sourceUrl = tab?.url || info.pageUrl || '';
  const sourceTitle = tab?.title || '未命名页面';
  if (info.menuItemId === MENU_ADD_TO_STASH) {
    if (info.selectionText) await saveTextItem(info.selectionText, sourceUrl, sourceTitle, 'context-menu');
    if (info.srcUrl) await saveImageItem(info.srcUrl, sourceUrl, sourceTitle, info.mediaType === 'image' ? '网页图片' : undefined, 'context-menu');
    return;
  }
  if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith(QUICK_PREFIX)) {
    const assistantId = info.menuItemId.replace(QUICK_PREFIX, '');
    await startQuickChat({
      type: 'START_QUICK_CHAT',
      payload: info.selectionText
        ? { assistantId, kind: 'text', text: info.selectionText, sourceUrl, sourceTitle }
        : { assistantId, kind: 'image', imageUrl: info.srcUrl || '', sourceUrl, sourceTitle, alt: '网页图片' },
    }, { tab } as chrome.runtime.MessageSender);
  }
}

export async function handleRuntimeMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender) {
  if (message.type === 'CAPTURE_TEXT') {
    return saveTextItem(message.payload.text, message.payload.sourceUrl, message.payload.sourceTitle, message.payload.captureMeta.capturedFrom);
  }
  if (message.type === 'CAPTURE_IMAGE') {
    return saveImageItem(message.payload.imageUrl, message.payload.sourceUrl, message.payload.sourceTitle, message.payload.alt, message.payload.captureMeta.capturedFrom);
  }
  if (message.type === 'START_QUICK_CHAT') {
    await startQuickChat(message, sender);
    return { ok: true };
  }
  if (message.type === 'OPEN_SIDE_PANEL') {
    await openSidePanel(message.payload?.windowId || sender.tab?.windowId);
    return { ok: true };
  }
  if (message.type === 'SYNC_COMPOSE_DRAFT') {
    await saveComposeDraft(message.payload);
    return { ok: true };
  }
  if (message.type === 'EXPORT_CONVERSATION') {
    const blob = new Blob([new Uint8Array(message.payload.bytes)], { type: message.payload.mimeType });
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({ url, filename: message.payload.filename, saveAs: true });
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { ok: true };
  }
  if (message.type === 'REFRESH_CONTEXT_MENUS') {
    await rebuildContextMenus();
    return { ok: true };
  }
  return undefined;
}
