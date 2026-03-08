export const APP_NAME = 'PicknPrompt';

export const STORAGE_KEYS = {
  models: 'picknprompt.models',
  assistants: 'picknprompt.assistants',
  preferences: 'picknprompt.preferences',
  composeDraft: 'picknprompt.composeDraft',
} as const;

export const DEFAULT_QUICK_CHAT_PROMPT = '请基于以上材料先提炼要点，再继续协助我。';

export const DATA_CHANGED_EVENT = 'DATA_CHANGED';

export const RUNTIME_MESSAGES = {
  captureText: 'CAPTURE_TEXT',
  captureImage: 'CAPTURE_IMAGE',
  openSidePanel: 'OPEN_SIDE_PANEL',
  startQuickChat: 'START_QUICK_CHAT',
  syncComposeDraft: 'SYNC_COMPOSE_DRAFT',
  exportConversation: 'EXPORT_CONVERSATION',
  refreshContextMenus: 'REFRESH_CONTEXT_MENUS',
  dataChanged: DATA_CHANGED_EVENT,
} as const;

export const SCHEMA_VERSION = 1;

export const DB_NAME = 'picknprompt-db';

export const DEFAULT_MODEL_STATUS = 'untested';

export const RESTRICTED_PROTOCOLS = ['chrome:', 'edge:', 'about:', 'chrome-extension:', 'moz-extension:'];
