import { db } from '../storage/db';
import type { StashItem, StashRepository } from '../types';

class IndexedDbStashRepository implements StashRepository {
  async list() {
    return db.stashItems.orderBy('updatedAt').reverse().toArray();
  }

  async getMany(ids: string[]) {
    if (!ids.length) {
      return [];
    }
    return db.stashItems.bulkGet(ids).then((items) => items.filter(Boolean) as StashItem[]);
  }

  async save(item: StashItem) {
    await db.stashItems.put(item);
    return item;
  }

  async remove(id: string) {
    await db.stashItems.delete(id);
  }
}

export const stashRepository = new IndexedDbStashRepository();
