import type { AssistantPreset, AssistantRepository } from '../types';
import { getAssistants, saveAssistants } from '../storage/chrome-storage';
import { createId } from '../utils/id';
import { nowIso } from '../utils/time';

class LocalAssistantRepository implements AssistantRepository {
  async list() {
    const assistants = await getAssistants();
    return assistants.sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || right.updatedAt.localeCompare(left.updatedAt));
  }

  async save(input: Omit<AssistantPreset, 'createdAt' | 'updatedAt'>) {
    const assistants = await getAssistants();
    const timestamp = nowIso();
    const next: AssistantPreset = assistants.find((item) => item.id === input.id)
      ? {
          ...assistants.find((item) => item.id === input.id)!,
          ...input,
          updatedAt: timestamp,
        }
      : {
          ...input,
          id: input.id || createId('assistant'),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    const normalized = assistants
      .filter((item) => item.id !== next.id)
      .map((item) => ({
        ...item,
        isDefault: next.isDefault ? false : item.isDefault,
      }));

    if (!normalized.some((item) => item.isDefault) && !next.isDefault) {
      next.isDefault = true;
    }

    await saveAssistants([...normalized, next]);
    return next;
  }

  async remove(id: string) {
    const assistants = await getAssistants();
    const next = assistants.filter((item) => item.id !== id);
    if (next.length && !next.some((item) => item.isDefault)) {
      next[0] = { ...next[0], isDefault: true, updatedAt: nowIso() };
    }
    await saveAssistants(next);
  }

  async ensureDefault() {
    const assistants = await this.list();
    const existingDefault = assistants.find((item) => item.isDefault);
    if (existingDefault) {
      return existingDefault;
    }

    return this.save({
      id: createId('assistant'),
      name: '默认助手',
      systemPrompt: '请优先依据用户选中的上下文内容来回答问题。',
      isDefault: true,
      isQuickAssistant: true,
    });
  }
}

export const assistantRepository = new LocalAssistantRepository();
