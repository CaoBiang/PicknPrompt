import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

const storageState = new Map<string, unknown>();

const local = {
  async get(keys?: string | string[] | Record<string, unknown>) {
    if (!keys) {
      return Object.fromEntries(storageState.entries());
    }
    if (typeof keys === 'string') {
      return { [keys]: storageState.get(keys) };
    }
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, storageState.get(key)]));
    }
    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [key, storageState.has(key) ? storageState.get(key) : fallback]),
    );
  },
  async set(values: Record<string, unknown>) {
    Object.entries(values).forEach(([key, value]) => storageState.set(key, value));
  },
  async remove(keys: string | string[]) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => storageState.delete(key));
  },
};

const runtime = {
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  sendMessage: vi.fn(),
};

const tabs = {
  create: vi.fn(),
  query: vi.fn(async () => []),
};

Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: { local, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
    runtime,
    tabs,
  },
  writable: true,
});
