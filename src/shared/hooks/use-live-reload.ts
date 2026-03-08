import { useCallback, useEffect, useState } from 'react';

import { subscribeRuntimeMessages } from '../messaging';
import { DATA_CHANGED_EVENT } from '../constants';
import type { RuntimeMessage } from '../types';

export function useLiveReload(loader: () => Promise<void>) {
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    await loader();
    setLoading(false);
  }, [loader]);

  useEffect(() => {
    void run();

    const unsubscribe = subscribeRuntimeMessages((message: RuntimeMessage) => {
      if (message.type === DATA_CHANGED_EVENT) {
        void run();
      }
    });

    return unsubscribe;
  }, [run]);

  return {
    loading,
    reload: run,
  };
}
