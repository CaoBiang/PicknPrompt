import { useEffect, useState } from 'react';

import { blobRepository } from '../repositories';

export function useBlobUrl(blobKey?: string) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blobKey) {
      setUrl(undefined);
      return;
    }

    let objectUrl: string | undefined;

    blobRepository.get(blobKey).then((asset) => {
      if (!asset) {
        return;
      }
      objectUrl = URL.createObjectURL(asset.blob);
      setUrl(objectUrl);
    });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [blobKey]);

  return url;
}
