import { XMarkdown } from '@ant-design/x-markdown';
import { useEffect, useMemo, useState } from 'react';

import { blobRepository } from '../repositories';
import type { MessagePart } from '../types';
import { partsToMarkdown } from '../utils/markdown';

type Props = {
  parts: MessagePart[];
};

export function MarkdownMessage({ parts }: Props) {
  const [assetMap, setAssetMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];

    Promise.all(
      parts
        .filter((part): part is Extract<MessagePart, { type: 'image' }> => part.type === 'image')
        .filter((part) => Boolean(part.blobKey))
        .map(async (part) => {
          const asset = await blobRepository.get(part.blobKey!);
          if (!asset) {
            return undefined;
          }

          const url = URL.createObjectURL(asset.blob);
          objectUrls.push(url);
          return [part.blobKey!, url] as const;
        }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setAssetMap(new Map(entries.filter(Boolean) as Array<readonly [string, string]>));
    });

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [parts]);

  const content = useMemo(
    () => partsToMarkdown(parts, (blobKey) => assetMap.get(blobKey) || undefined),
    [assetMap, parts],
  );

  return <XMarkdown content={content || ' '} />;
}
