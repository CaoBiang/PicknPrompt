import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../storage/db';
import { conversationRepository, DEFAULT_CONVERSATION_TITLE } from './conversation-repository';

describe('conversationRepository.findReusableDraft', () => {
  beforeEach(async () => {
    await db.turns.clear();
    await db.conversations.clear();
  });

  it('returns an empty untitled conversation when available', async () => {
    const usedConversation = await conversationRepository.create();

    await conversationRepository.saveTurn({
      id: 'turn_1',
      conversationId: usedConversation.id,
      role: 'user',
      parts: [{ type: 'text', text: 'hello world' }],
      stashSnapshots: [],
      streamState: 'done',
      createdAt: '2026-03-08T00:00:00.000Z',
      updatedAt: '2026-03-08T00:00:00.000Z',
    });

    const blankConversation = await conversationRepository.create();
    const reusableConversation = await conversationRepository.findReusableDraft();

    expect(reusableConversation?.id).toBe(blankConversation.id);
    expect(reusableConversation?.title).toBe(DEFAULT_CONVERSATION_TITLE);
  });
});
