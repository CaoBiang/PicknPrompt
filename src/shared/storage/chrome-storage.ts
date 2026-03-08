import { STORAGE_KEYS } from '../constants';
import type {
  AssistantPreset,
  ComposeDraft,
  ModelConfig,
  PreferencesState,
  StorageState,
} from '../types';

const inMemoryStorage = new Map<string, unknown>();

function getStorageArea() {
  return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;
}

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const storageArea = getStorageArea();

  if (!storageArea) {
    return (inMemoryStorage.get(key) as T | undefined) ?? fallback;
  }

  const result = await storageArea.get({ [key]: fallback });
  return (result[key] as T | undefined) ?? fallback;
}

async function writeKey<T>(key: string, value: T) {
  const storageArea = getStorageArea();

  if (!storageArea) {
    inMemoryStorage.set(key, value);
    return;
  }

  await storageArea.set({ [key]: value });
}

export const defaultComposeDraft: ComposeDraft = {
  selectedStashIds: [],
  pendingAutoSend: false,
  seedUserPrompt: '',
  source: 'manual',
};

export const defaultPreferences: PreferencesState = {};

export async function getModels() {
  return readKey<ModelConfig[]>(STORAGE_KEYS.models, []);
}

export async function saveModels(models: ModelConfig[]) {
  await writeKey(STORAGE_KEYS.models, models);
}

export async function getAssistants() {
  return readKey<AssistantPreset[]>(STORAGE_KEYS.assistants, []);
}

export async function saveAssistants(assistants: AssistantPreset[]) {
  await writeKey(STORAGE_KEYS.assistants, assistants);
}

export async function getComposeDraft() {
  return readKey<ComposeDraft>(STORAGE_KEYS.composeDraft, defaultComposeDraft);
}

export async function saveComposeDraft(draft: ComposeDraft) {
  await writeKey(STORAGE_KEYS.composeDraft, draft);
}

export async function getPreferences() {
  return readKey<PreferencesState>(STORAGE_KEYS.preferences, defaultPreferences);
}

export async function savePreferences(preferences: PreferencesState) {
  await writeKey(STORAGE_KEYS.preferences, preferences);
}

export async function getStorageState(): Promise<StorageState> {
  const [models, assistants, preferences, composeDraft] = await Promise.all([
    getModels(),
    getAssistants(),
    getPreferences(),
    getComposeDraft(),
  ]);

  return {
    models,
    assistants,
    preferences,
    composeDraft,
  };
}
