import { describe, expect, it } from 'vitest';

import { exportConversationBundle } from './conversation-markdown';

describe('conversation markdown export', () => {
  it('exports markdown when no assets exist', async () => {
    const bundle = {
      conversation: {
        id: 'conversation_1',
        title: '测试会话',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      turns: [
        {
          id: 'turn_1',
          conversationId: 'conversation_1',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: '你好' }],
          stashSnapshots: [],
          streamState: 'done' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const result = await exportConversationBundle(bundle);
    expect(result.filename.endsWith('.md')).toBe(true);
    expect(result.mimeType).toContain('text/markdown');
    expect(result.bytes.length).toBeGreaterThan(0);
  });
});
