import Dexie, { type Table } from 'dexie';

import { DB_NAME } from '../constants';
import type { BlobAsset, Conversation, ConversationTurn, StashItem } from '../types';

class PicknPromptDatabase extends Dexie {
  stashItems!: Table<StashItem, string>;
  conversations!: Table<Conversation, string>;
  turns!: Table<ConversationTurn, string>;
  blobs!: Table<BlobAsset, string>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      stashItems: 'id, type, sourceUrl, sourceTitle, createdAt, updatedAt',
      conversations: 'id, title, createdAt, updatedAt',
      turns: 'id, conversationId, role, createdAt, updatedAt',
      blobs: 'id, createdAt',
    });
  }
}

export const db = new PicknPromptDatabase();
