import { defaultComposeDraft, getAssistants, getComposeDraft, getModels, saveAssistants, saveComposeDraft, saveModels } from './chrome-storage';
import type { AssistantPreset, ModelConfig } from '../types';
import { createId } from '../utils/id';
import { nowIso } from '../utils/time';

function createDefaultAssistant(): AssistantPreset {
  const timestamp = nowIso();
  return {
    id: createId('assistant'),
    name: '默认助手',
    systemPrompt:
      '你是 PicknPrompt 的默认助手。请优先根据用户选中的网页材料作答；若材料不足，明确指出不足并提出下一步建议。',
    isDefault: true,
    isQuickAssistant: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const DEFAULT_MODEL_CONFIG_SEED = {
  name: '默认大模型',
  baseUrl: 'http://169.254.12.43:3000/v1',
  apiKey: 'sk-rXyxIDywdc1czrzzACP1CRJlUN27U9XwMSACe1R2gfnbcZTg',
  model: 'gpt-5.4',
  supportsVision: true,
  enabled: true,
} as const;

function createDefaultModelConfig(): ModelConfig {
  const timestamp = nowIso();
  return {
    id: createId('model'),
    ...DEFAULT_MODEL_CONFIG_SEED,
    status: 'untested',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function ensureBootstrapData() {
  const assistants = await getAssistants();
  if (!assistants.length) {
    await saveAssistants([createDefaultAssistant()]);
  }

  const models = await getModels();
  if (!models.length) {
    await saveModels([createDefaultModelConfig()]);
  }

  const composeDraft = await getComposeDraft();
  const nextComposeDraft = {
    ...defaultComposeDraft,
    ...composeDraft,
  };

  if (JSON.stringify(composeDraft) !== JSON.stringify(nextComposeDraft)) {
    await saveComposeDraft(nextComposeDraft);
  }
}
