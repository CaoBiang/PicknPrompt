import { db } from '../storage/db';
import type { BlobAsset, BlobRepository } from '../types';

class IndexedDbBlobRepository implements BlobRepository {
  async save(blobAsset: BlobAsset) {
    await db.blobs.put(blobAsset);
    return blobAsset;
  }

  async get(id: string) {
    return db.blobs.get(id);
  }

  async remove(id: string) {
    await db.blobs.delete(id);
  }
}

export const blobRepository = new IndexedDbBlobRepository();
