import { describe, expect, it } from 'vitest';

import { DEFAULT_MODEL_CONFIG_SEED, ensureBootstrapData } from './bootstrap';
import { getAssistants, getModels } from './chrome-storage';

describe('bootstrap', () => {
  it('creates a default assistant', async () => {
    await ensureBootstrapData();
    const assistants = await getAssistants();
    expect(assistants.length).toBeGreaterThan(0);
    expect(assistants.some((item) => item.isDefault)).toBe(true);
  });

  it('creates a default model config', async () => {
    await ensureBootstrapData();
    const models = await getModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toMatchObject({
      name: DEFAULT_MODEL_CONFIG_SEED.name,
      baseUrl: DEFAULT_MODEL_CONFIG_SEED.baseUrl,
      model: DEFAULT_MODEL_CONFIG_SEED.model,
      supportsVision: DEFAULT_MODEL_CONFIG_SEED.supportsVision,
      enabled: DEFAULT_MODEL_CONFIG_SEED.enabled,
      status: 'untested',
    });
  });
});
