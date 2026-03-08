export type ModelStatus = 'untested' | 'ok' | 'error';

export type StashItemType = 'text' | 'image';

export type ConversationRole = 'user' | 'assistant' | 'system';

export type StreamState = 'idle' | 'streaming' | 'done' | 'error';

export type ComposeDraftSource = 'manual' | 'quick-assistant';

export interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  supportsVision: boolean;
  enabled: boolean;
  status: ModelStatus;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantPreset {
  id: string;
  name: string;
  systemPrompt: string;
  isDefault: boolean;
  isQuickAssistant: boolean;
  preferredModelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaptureMeta {
  capturedFrom: 'selection' | 'image-button' | 'context-menu' | 'quick-assistant';
  pageSelection?: string;
  alt?: string;
  mimeType?: string;
  size?: number;
}

export interface StashItem {
  id: string;
  type: StashItemType;
  sourceUrl: string;
  sourceTitle: string;
  textContent?: string;
  blobKey?: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
  captureMeta: CaptureMeta;
}

export interface AssistantSnapshot {
  id: string;
  name: string;
  systemPrompt: string;
  preferredModelId?: string;
}

export interface ModelSnapshot {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  supportsVision: boolean;
}

export type TextMessagePart = {
  type: 'text';
  text: string;
};

export type ImageMessagePart = {
  type: 'image';
  blobKey?: string;
  previewUrl?: string;
  sourceUrl?: string;
  alt?: string;
  mimeType?: string;
};

export type MessagePart = TextMessagePart | ImageMessagePart;

export interface StashSnapshot {
  id: string;
  type: StashItemType;
  sourceUrl: string;
  sourceTitle: string;
  textContent?: string;
  blobKey?: string;
  previewUrl?: string;
  captureMeta: CaptureMeta;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  defaultAssistantId?: string;
  defaultModelConfigId?: string;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  role: ConversationRole;
  parts: MessagePart[];
  assistantSnapshot?: AssistantSnapshot;
  modelSnapshot?: ModelSnapshot;
  stashSnapshots: StashSnapshot[];
  streamState: StreamState;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface ComposeDraft {
  selectedStashIds: string[];
  assistantId?: string;
  modelConfigId?: string;
  pendingAutoSend: boolean;
  seedUserPrompt: string;
  source: ComposeDraftSource;
}

export interface PreferencesState {
  lastAssistantId?: string;
  lastModelConfigId?: string;
}

export interface StorageState {
  models: ModelConfig[];
  assistants: AssistantPreset[];
  preferences: PreferencesState;
  composeDraft: ComposeDraft;
}

export interface BlobAsset {
  id: string;
  blob: Blob;
  mimeType?: string;
  createdAt: string;
}

export interface ExportAssetManifest {
  blobKey: string;
  fileName: string;
  mimeType?: string;
}

export interface ExportManifestTurn {
  id: string;
  role: ConversationRole;
  createdAt: string;
  stashSnapshots: StashSnapshot[];
  assistantSnapshot?: AssistantSnapshot;
  modelSnapshot?: ModelSnapshot;
}

export interface ExportManifest {
  schemaVersion: number;
  conversationId: string;
  title: string;
  createdAt: string;
  assistant?: AssistantSnapshot;
  model?: ModelSnapshot;
  assets: ExportAssetManifest[];
  turns: ExportManifestTurn[];
}

export type DataEntity = 'model' | 'assistant' | 'stash' | 'conversation';

export interface DataChangedPayload {
  entity: DataEntity;
  action: 'create' | 'update' | 'delete' | 'bulk';
}

export type RuntimeMessage =
  | {
      type: 'CAPTURE_TEXT';
      payload: {
        text: string;
        sourceUrl: string;
        sourceTitle: string;
        captureMeta: CaptureMeta;
      };
    }
  | {
      type: 'CAPTURE_IMAGE';
      payload: {
        imageUrl: string;
        sourceUrl: string;
        sourceTitle: string;
        alt?: string;
        captureMeta: CaptureMeta;
      };
    }
  | {
      type: 'OPEN_SIDE_PANEL';
      payload?: { windowId?: number };
    }
  | {
      type: 'START_QUICK_CHAT';
      payload: {
        assistantId: string;
        kind: 'text' | 'image';
        text?: string;
        imageUrl?: string;
        sourceUrl: string;
        sourceTitle: string;
        alt?: string;
      };
    }
  | {
      type: 'SYNC_COMPOSE_DRAFT';
      payload: ComposeDraft;
    }
  | {
      type: 'EXPORT_CONVERSATION';
      payload: {
        filename: string;
        mimeType: string;
        bytes: number[];
      };
    }
  | {
      type: 'REFRESH_CONTEXT_MENUS';
    }
  | {
      type: 'DATA_CHANGED';
      payload: DataChangedPayload;
    };

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface ModelGatewayInput {
  modelConfig: ModelConfig;
  assistant: AssistantPreset;
  history: ConversationTurn[];
  stashItems: StashItem[];
  userPrompt: string;
  signal?: AbortSignal;
}

export type ModelEvent =
  | { type: 'response-created'; id: string }
  | { type: 'text-delta'; delta: string }
  | { type: 'completed' }
  | { type: 'error'; message: string };

export interface ModelGateway {
  testConnection(modelConfig: ModelConfig): Promise<ConnectionTestResult>;
  sendStream(input: ModelGatewayInput): AsyncIterable<ModelEvent>;
}

export interface ConversationBundle {
  conversation: Conversation;
  turns: ConversationTurn[];
}

export interface AssistantRepository {
  list(): Promise<AssistantPreset[]>;
  save(input: Omit<AssistantPreset, 'createdAt' | 'updatedAt'>): Promise<AssistantPreset>;
  remove(id: string): Promise<void>;
  ensureDefault(): Promise<AssistantPreset>;
}

export interface ModelConfigRepository {
  list(): Promise<ModelConfig[]>;
  save(input: Omit<ModelConfig, 'createdAt' | 'updatedAt'>): Promise<ModelConfig>;
  remove(id: string): Promise<void>;
}

export interface StashRepository {
  list(): Promise<StashItem[]>;
  getMany(ids: string[]): Promise<StashItem[]>;
  save(item: StashItem): Promise<StashItem>;
  remove(id: string): Promise<void>;
}

export interface BlobRepository {
  save(blobAsset: BlobAsset): Promise<BlobAsset>;
  get(id: string): Promise<BlobAsset | undefined>;
  remove(id: string): Promise<void>;
}

export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  get(id: string): Promise<Conversation | undefined>;
  getBundle(id: string): Promise<ConversationBundle | undefined>;
  findReusableDraft(): Promise<Conversation | undefined>;
  create(input?: Partial<Conversation>): Promise<Conversation>;
  save(conversation: Conversation): Promise<Conversation>;
  listTurns(conversationId: string): Promise<ConversationTurn[]>;
  saveTurn(turn: ConversationTurn): Promise<ConversationTurn>;
  remove(id: string): Promise<void>;
}
