import matter from 'gray-matter';
import { strFromU8, strToU8, zip, unzip } from 'fflate';

import { SCHEMA_VERSION } from '../constants';
import { blobRepository } from '../repositories';
import type {
  BlobAsset,
  Conversation,
  ConversationBundle,
  ConversationTurn,
  ExportAssetManifest,
  ExportManifest,
  MessagePart,
} from '../types';
import { createId } from '../utils/id';
import { partsToMarkdown } from '../utils/markdown';
import { nowIso } from '../utils/time';

const TURN_SPLIT_PATTERN = /^##\s+(User|Assistant|System)\s*$/gim;
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

function guessExtension(mimeType?: string) {
  if (!mimeType) {
    return 'bin';
  }

  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return mimeType.split('/')[1] || 'bin';
}

async function collectAssets(turns: ConversationTurn[]) {
  const assets = new Map<string, BlobAsset>();

  for (const turn of turns) {
    for (const part of turn.parts) {
      if (part.type !== 'image' || !part.blobKey) {
        continue;
      }
      const blob = await blobRepository.get(part.blobKey);
      if (blob) {
        assets.set(blob.id, blob);
      }
    }
  }

  return [...assets.values()];
}

function formatTurnHeading(role: ConversationTurn['role']) {
  if (role === 'assistant') return 'Assistant';
  if (role === 'system') return 'System';
  return 'User';
}

function replacePartAssetReferences(parts: MessagePart[], assetMap: Map<string, string>) {
  return partsToMarkdown(parts, (blobKey) => assetMap.get(blobKey));
}

export async function exportConversationBundle(bundle: ConversationBundle) {
  const assets = await collectAssets(bundle.turns);
  const assetManifest: ExportAssetManifest[] = assets.map((asset) => ({
    blobKey: asset.id,
    fileName: `assets/${asset.id}.${guessExtension(asset.mimeType)}`,
    mimeType: asset.mimeType,
  }));

  const assetPathMap = new Map(assetManifest.map((item) => [item.blobKey, item.fileName]));
  const manifest = JSON.parse(JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    conversationId: bundle.conversation.id,
    title: bundle.conversation.title,
    createdAt: bundle.conversation.createdAt,
    assistant: bundle.turns.find((turn) => turn.assistantSnapshot)?.assistantSnapshot,
    model: bundle.turns.find((turn) => turn.modelSnapshot)?.modelSnapshot,
    assets: assetManifest,
    turns: bundle.turns.map((turn) => ({
      id: turn.id,
      role: turn.role,
      createdAt: turn.createdAt,
      stashSnapshots: turn.stashSnapshots,
      assistantSnapshot: turn.assistantSnapshot,
      modelSnapshot: turn.modelSnapshot,
    })),
  })) as ExportManifest;

  const body = bundle.turns
    .map((turn) => `## ${formatTurnHeading(turn.role)}\n\n${replacePartAssetReferences(turn.parts, assetPathMap)}`.trim())
    .join('\n\n');

  const markdown = matter.stringify(body, manifest);

  if (!assets.length) {
    return {
      filename: `${bundle.conversation.title || 'conversation'}.md`,
      mimeType: 'text/markdown;charset=utf-8',
      bytes: strToU8(markdown),
    };
  }

  const zipEntries: Record<string, Uint8Array> = {
    'conversation.md': strToU8(markdown),
  };

  for (const asset of assets) {
    const entry = assetManifest.find((item) => item.blobKey === asset.id);
    if (!entry) continue;
    zipEntries[entry.fileName] = new Uint8Array(await asset.blob.arrayBuffer());
  }

  const bytes = zipSyncPromise(zipEntries);
  return {
    filename: `${bundle.conversation.title || 'conversation'}.zip`,
    mimeType: 'application/zip',
    bytes: await bytes,
  };
}

function zipSyncPromise(files: Record<string, Uint8Array>) {
  return new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}

function markdownToParts(markdown: string, assetResolver: (source: string) => Promise<MessagePart>) {
  IMAGE_PATTERN.lastIndex = 0;
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match = IMAGE_PATTERN.exec(markdown);

  while (match) {
    const [fullMatch, alt, src] = match;
    const leading = markdown.slice(lastIndex, match.index).trim();
    if (leading) {
      parts.push({ type: 'text', text: leading });
    }

    parts.push({
      type: 'image',
      alt,
      sourceUrl: src,
      previewUrl: src,
    });

    lastIndex = match.index + fullMatch.length;
    match = IMAGE_PATTERN.exec(markdown);
  }

  const trailing = markdown.slice(lastIndex).trim();
  if (trailing) {
    parts.push({ type: 'text', text: trailing });
  }

  if (!parts.length) {
    parts.push({ type: 'text', text: markdown.trim() });
  }

  return Promise.all(
    parts.map(async (part) => {
      if (part.type !== 'image' || !part.sourceUrl) {
        return part;
      }
      return assetResolver(part.sourceUrl);
    }),
  );
}

function splitMarkdownSections(content: string) {
  const sections: Array<{ role: ConversationTurn['role']; markdown: string }> = [];
  const matches = [...content.matchAll(TURN_SPLIT_PATTERN)];

  if (!matches.length) {
    return sections;
  }

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    const roleLabel = match[1].toLowerCase();
    const markdown = content.slice(start + match[0].length, end).trim();
    sections.push({
      role: roleLabel === 'assistant' ? 'assistant' : roleLabel === 'system' ? 'system' : 'user',
      markdown,
    });
  });

  return sections;
}

async function bufferToZipMap(bytes: Uint8Array) {
  return new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, {}, (error, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(files);
    });
  });
}

async function resolveAssetPart(source: string, zipEntries?: Record<string, Uint8Array>): Promise<MessagePart> {
  if (!zipEntries || !source.startsWith('assets/')) {
    return {
      type: 'image',
      alt: '图片',
      sourceUrl: source,
      previewUrl: source,
    };
  }

  const entry = zipEntries[source];
  if (!entry) {
    return {
      type: 'image',
      alt: '图片',
      sourceUrl: source,
      previewUrl: source,
    };
  }

  const mimeType = source.endsWith('.png') ? 'image/png' : source.endsWith('.jpg') || source.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream';
  const blob = new Blob([new Uint8Array(entry).buffer], { type: mimeType });
  const blobKey = createId('blob');
  await blobRepository.save({
    id: blobKey,
    blob,
    mimeType,
    createdAt: nowIso(),
  });

  return {
    type: 'image',
    blobKey,
    alt: '图片',
    previewUrl: URL.createObjectURL(blob),
    mimeType,
  };
}

export async function importConversationBytes(bytes: Uint8Array, fileName: string): Promise<ConversationBundle> {
  const isZip = fileName.toLowerCase().endsWith('.zip');
  let markdown = '';
  let zipEntries: Record<string, Uint8Array> | undefined;

  if (isZip) {
    zipEntries = await bufferToZipMap(bytes);
    markdown = strFromU8(zipEntries['conversation.md']);
  } else {
    markdown = strFromU8(bytes);
  }

  const parsed = matter(markdown);
  const manifest = parsed.data as ExportManifest;
  const sections = splitMarkdownSections(parsed.content);
  const conversation: Conversation = {
    id: manifest.conversationId || createId('conversation'),
    title: manifest.title || '导入会话',
    createdAt: manifest.createdAt || nowIso(),
    updatedAt: nowIso(),
    defaultAssistantId: manifest.assistant?.id,
    defaultModelConfigId: manifest.model?.id,
  };

  const turns: ConversationTurn[] = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const turnManifest = manifest.turns?.[index];
    const parts = await markdownToParts(section.markdown, async (source) => resolveAssetPart(source, zipEntries));
    turns.push({
      id: turnManifest?.id || createId('turn'),
      conversationId: conversation.id,
      role: turnManifest?.role || section.role,
      parts,
      assistantSnapshot: turnManifest?.assistantSnapshot,
      modelSnapshot: turnManifest?.modelSnapshot,
      stashSnapshots: turnManifest?.stashSnapshots || [],
      streamState: 'done',
      createdAt: turnManifest?.createdAt || nowIso(),
      updatedAt: nowIso(),
    });
  }

  return {
    conversation,
    turns,
  };
}
