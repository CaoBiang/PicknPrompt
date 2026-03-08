import { db } from '../storage/db';
import type { Conversation, ConversationBundle, ConversationRepository, ConversationTurn } from '../types';
import { createId } from '../utils/id';
import { nowIso } from '../utils/time';

export const DEFAULT_CONVERSATION_TITLE = '新会话';

class IndexedDbConversationRepository implements ConversationRepository {
  async list() {
    return db.conversations.orderBy('updatedAt').reverse().toArray();
  }

  async get(id: string) {
    return db.conversations.get(id);
  }

  async getBundle(id: string): Promise<ConversationBundle | undefined> {
    const conversation = await this.get(id);
    if (!conversation) {
      return undefined;
    }

    const turns = await this.listTurns(id);
    return { conversation, turns };
  }

  async findReusableDraft() {
    const conversations = await this.list();

    for (const conversation of conversations) {
      if (conversation.title !== DEFAULT_CONVERSATION_TITLE) {
        continue;
      }

      const turnCount = await db.turns.where('conversationId').equals(conversation.id).count();
      if (turnCount === 0) {
        return conversation;
      }
    }

    return undefined;
  }

  async create(input: Partial<Conversation> = {}) {
    const timestamp = nowIso();
    const conversation: Conversation = {
      id: createId('conversation'),
      title: input.title || DEFAULT_CONVERSATION_TITLE,
      createdAt: timestamp,
      updatedAt: timestamp,
      defaultAssistantId: input.defaultAssistantId,
      defaultModelConfigId: input.defaultModelConfigId,
    };

    await db.conversations.put(conversation);
    return conversation;
  }

  async save(conversation: Conversation) {
    const next = {
      ...conversation,
      updatedAt: nowIso(),
    };
    await db.conversations.put(next);
    return next;
  }

  async listTurns(conversationId: string) {
    return db.turns.where('conversationId').equals(conversationId).sortBy('createdAt');
  }

  async saveTurn(turn: ConversationTurn) {
    const next = {
      ...turn,
      updatedAt: nowIso(),
    };
    await db.turns.put(next);

    const conversation = await db.conversations.get(turn.conversationId);
    if (conversation) {
      await db.conversations.put({
        ...conversation,
        title: conversation.title === DEFAULT_CONVERSATION_TITLE && turn.role === 'user' && turn.parts.length
          ? (turn.parts.find((part) => part.type === 'text')?.text.slice(0, 24) || conversation.title)
          : conversation.title,
        updatedAt: next.updatedAt,
      });
    }

    return next;
  }

  async remove(id: string) {
    await db.transaction('rw', db.conversations, db.turns, async () => {
      await db.conversations.delete(id);
      const turnIds = await db.turns.where('conversationId').equals(id).primaryKeys();
      await db.turns.bulkDelete(turnIds);
    });
  }
}

export const conversationRepository = new IndexedDbConversationRepository();
