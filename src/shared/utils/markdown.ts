import type { ImageMessagePart, MessagePart, StashItem, StashSnapshot } from '../types';

export function stashItemToSnapshot(item: StashItem): StashSnapshot {
  return {
    id: item.id,
    type: item.type,
    sourceUrl: item.sourceUrl,
    sourceTitle: item.sourceTitle,
    textContent: item.textContent,
    blobKey: item.blobKey,
    previewUrl: item.previewUrl,
    captureMeta: item.captureMeta,
  };
}

function imageMarkdown(part: ImageMessagePart, resolver?: (blobKey: string) => string | undefined) {
  const resolved = part.blobKey ? resolver?.(part.blobKey) : undefined;
  const source = resolved || part.previewUrl || part.sourceUrl;

  if (!source) {
    return '';
  }

  return `![${part.alt || '图片'}](${source})`;
}

export function partsToMarkdown(parts: MessagePart[], resolver?: (blobKey: string) => string | undefined) {
  return parts
    .map((part) => {
      if (part.type === 'text') {
        return part.text.trim();
      }

      return imageMarkdown(part, resolver);
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function stashItemsToPromptBlocks(stashItems: StashItem[]) {
  return stashItems.map((item, index) => {
    if (item.type === 'text') {
      return `材料 ${index + 1}\n来源标题：${item.sourceTitle}\n来源链接：${item.sourceUrl}\n内容：\n${item.textContent || ''}`;
    }

    return `材料 ${index + 1}\n来源标题：${item.sourceTitle}\n来源链接：${item.sourceUrl}\n图片说明：${item.captureMeta.alt || '网页图片'}`;
  });
}

export function buildUserTurnParts(stashItems: StashItem[], userPrompt: string): MessagePart[] {
  const parts: MessagePart[] = [];

  stashItems.forEach((item, index) => {
    const header = `### 材料 ${index + 1}\n来源标题：${item.sourceTitle}\n来源链接：${item.sourceUrl}`;
    if (item.type === 'text') {
      parts.push({
        type: 'text',
        text: `${header}\n\n${item.textContent || ''}`,
      });
      return;
    }

    parts.push({
      type: 'text',
      text: `${header}\n\n图片说明：${item.captureMeta.alt || '网页图片'}`,
    });
    parts.push({
      type: 'image',
      blobKey: item.blobKey,
      previewUrl: item.previewUrl,
      sourceUrl: item.sourceUrl,
      alt: item.captureMeta.alt || item.sourceTitle,
      mimeType: item.captureMeta.mimeType,
    });
  });

  parts.push({
    type: 'text',
    text: userPrompt.trim(),
  });

  return parts;
}
