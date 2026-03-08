import { useEffect, useState } from 'react';

import { defaultComposeDraft, getComposeDraft, saveComposeDraft } from '../storage/chrome-storage';
import type { ComposeDraft } from '../types';

export function useComposeDraft() {
  const [draft, setDraft] = useState<ComposeDraft>(defaultComposeDraft);

  useEffect(() => {
    void getComposeDraft().then(setDraft);
  }, []);

  const updateDraft = async (nextDraft: ComposeDraft) => {
    setDraft(nextDraft);
    await saveComposeDraft(nextDraft);
  };

  return {
    draft,
    setDraft: updateDraft,
  };
}
