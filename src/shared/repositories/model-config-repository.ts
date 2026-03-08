import type { ModelConfig, ModelConfigRepository } from '../types';
import { getModels, saveModels } from '../storage/chrome-storage';
import { createId } from '../utils/id';
import { nowIso } from '../utils/time';

class LocalModelConfigRepository implements ModelConfigRepository {
  async list() {
    const items = await getModels();
    return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async save(input: Omit<ModelConfig, 'createdAt' | 'updatedAt'>) {
    const items = await getModels();
    const timestamp = nowIso();
    const existing = items.find((item) => item.id === input.id);
    const next: ModelConfig = existing
      ? {
          ...existing,
          ...input,
          updatedAt: timestamp,
        }
      : {
          ...input,
          id: input.id || createId('model'),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    const filtered = items.filter((item) => item.id !== next.id);
    await saveModels([...filtered, next]);
    return next;
  }

  async remove(id: string) {
    const items = await getModels();
    await saveModels(items.filter((item) => item.id !== id));
  }
}

export const modelConfigRepository = new LocalModelConfigRepository();
