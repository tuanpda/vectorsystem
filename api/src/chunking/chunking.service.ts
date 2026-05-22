import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { ContentListBlock, DraftChunk } from './chunking.types';

@Injectable()
export class ChunkingService {
  constructor(private readonly config: AppConfigService) {}

  chunkFromContentList(
    blocks: ContentListBlock[],
    documentTitle: string,
  ): DraftChunk[] {
    const sorted = [...blocks].sort(
      (a, b) => (a.page_idx ?? 0) - (b.page_idx ?? 0),
    );

    const maxChars = this.config.chunkMaxChars;
    const overlap = this.config.chunkOverlapChars;
    const drafts: DraftChunk[] = [];
    let chunkIndex = 0;
    let headingPath = documentTitle;
    let textBuffer = '';

    const flushText = (pageIdx: number | null) => {
      const parts = splitWithOverlap(textBuffer.trim(), maxChars, overlap);
      for (const part of parts) {
        if (!part.trim()) {
          continue;
        }
        drafts.push({
          chunkIndex: chunkIndex++,
          blockType: 'text',
          content: part,
          pageIdx,
          headingPath,
          metadata: { source: 'content_list' },
        });
      }
      textBuffer = overlap > 0 && parts.length > 0 ? parts[parts.length - 1].slice(-overlap) : '';
    };

    for (const block of sorted) {
      const pageIdx = block.page_idx ?? null;

      switch (block.type) {
        case 'text':
        case 'title':
          if (block.text_level && block.text_level > 0) {
            if (textBuffer.trim()) {
              flushText(pageIdx);
            }
            headingPath = [documentTitle, block.text?.trim()].filter(Boolean).join(' > ');
          }
          if (block.text?.trim()) {
            textBuffer += (textBuffer ? '\n\n' : '') + block.text.trim();
          }
          break;

        case 'table': {
          if (textBuffer.trim()) {
            flushText(pageIdx);
          }
          const tableText = formatTable(block);
          if (tableText) {
            drafts.push({
              chunkIndex: chunkIndex++,
              blockType: 'table',
              content: tableText,
              pageIdx,
              headingPath,
              metadata: { bbox: block.bbox },
            });
          }
          break;
        }

        case 'equation': {
          if (textBuffer.trim()) {
            flushText(pageIdx);
          }
          const eq = block.text?.trim();
          if (eq) {
            drafts.push({
              chunkIndex: chunkIndex++,
              blockType: 'equation',
              content: `[Formula] ${eq}`,
              pageIdx,
              headingPath,
              metadata: { text_format: block.text_format, bbox: block.bbox },
            });
          }
          break;
        }

        case 'image': {
          if (textBuffer.trim()) {
            flushText(pageIdx);
          }
          const caption = [
            ...(block.image_caption ?? []),
            ...(block.image_footnote ?? []),
          ]
            .join(' ')
            .trim();
          if (caption) {
            drafts.push({
              chunkIndex: chunkIndex++,
              blockType: 'image',
              content: `[Image] ${caption}`,
              pageIdx,
              headingPath,
              metadata: { bbox: block.bbox },
            });
          }
          break;
        }

        case 'list':
        case 'index': {
          if (textBuffer.trim()) {
            flushText(pageIdx);
          }
          const items = block.list_items ?? (block.text ? [block.text] : []);
          const body = items.map((i) => `- ${i}`).join('\n');
          if (body) {
            drafts.push({
              chunkIndex: chunkIndex++,
              blockType: block.type,
              content: body,
              pageIdx,
              headingPath,
              metadata: {},
            });
          }
          break;
        }

        default:
          if (block.text?.trim()) {
            textBuffer += (textBuffer ? '\n\n' : '') + block.text.trim();
          }
      }
    }

    if (textBuffer.trim()) {
      flushText(sorted[sorted.length - 1]?.page_idx ?? null);
    }

    return drafts;
  }

  estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}

function formatTable(block: ContentListBlock): string {
  const caption = (block.table_caption ?? []).join(' ').trim();
  const body = stripHtml(block.table_body ?? '');
  if (!caption && !body) {
    return '';
  }
  return [caption ? `[Table] ${caption}` : '[Table]', body]
    .filter(Boolean)
    .join('\n\n');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitWithOverlap(
  text: string,
  maxChars: number,
  overlap: number,
): string[] {
  if (text.length <= maxChars) {
    return [text];
  }
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n\n', end);
      if (breakAt > start + maxChars * 0.5) {
        end = breakAt;
      }
    }
    parts.push(text.slice(start, end).trim());
    if (end >= text.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }
  return parts.filter(Boolean);
}
