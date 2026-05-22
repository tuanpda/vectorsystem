import { Document } from '../api/client';

export const BUSY_STATUSES = new Set([
  'queued_parse',
  'parsing',
  'queued_index',
  'indexing',
]);

export function canParse(doc: Document): boolean {
  return !BUSY_STATUSES.has(doc.status);
}

export function canIndex(doc: Document): boolean {
  if (BUSY_STATUSES.has(doc.status)) return false;
  return (
    doc.status === 'parsed' ||
    doc.status === 'indexed' ||
    doc.status === 'failed'
  );
}

export function canViewChunks(doc: Document): boolean {
  return doc.chunkCount > 0;
}

export function canViewMarkdown(doc: Document): boolean {
  return (
    doc.status === 'parsed' ||
    doc.status === 'indexed' ||
    doc.status === 'failed'
  );
}
