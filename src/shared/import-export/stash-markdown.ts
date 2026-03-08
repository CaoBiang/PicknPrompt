import { strToU8 } from 'fflate';

import type { StashItem } from '../types';

export function exportStashItemsToMarkdown(items: StashItem[]) {
  const body = items
    .map((item, index) => {
      const header = `## 条目 ${index + 1} · ${item.sourceTitle}`;
      const meta = [`- 来源：${item.sourceUrl}`, `- 类型：${item.type}`, `- 采集时间：${item.createdAt}`].join('\n');
      if (item.type === 'text') {
        return `${header}\n\n${meta}\n\n${item.textContent || ''}`;
      }

      return `${header}\n\n${meta}\n\n![${item.captureMeta.alt || '图片'}](${item.previewUrl || item.sourceUrl})`;
    })
    .join('\n\n');

  return {
    filename: `stash-export-${Date.now()}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    bytes: strToU8(body),
  };
}
