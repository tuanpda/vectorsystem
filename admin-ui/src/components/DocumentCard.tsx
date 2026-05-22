import { Document } from '../api/client';
import {
  BUSY_STATUSES,
  canIndex,
  canParse,
  canViewChunks,
  canViewMarkdown,
} from '../lib/docActions';
import { formatIndexCost, indexButtonLabel, parseButtonLabel, vi } from '../lib/vi';
import { StatusBadge } from './StatusBadge';

type Props = {
  doc: Document;
  busy: boolean;
  onParse: () => void;
  onIndex: () => void;
  onMarkdown: () => void;
  onChunks: () => void;
  onDelete: () => void;
};

export function DocumentCard({
  doc,
  busy,
  onParse,
  onIndex,
  onMarkdown,
  onChunks,
  onDelete,
}: Props) {
  return (
    <article className="doc-card">
      <div className="doc-card-top">
        <div>
          <h3 className="doc-card-title">{doc.title}</h3>
          <p className="doc-card-file">{doc.originalName}</p>
        </div>
        <StatusBadge status={doc.status} />
      </div>
      <div className="doc-card-meta">
        <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
        <span>{doc.chunkCount} chunks</span>
        {doc.indexEstimatedUsd != null && doc.indexEstimatedUsd > 0 && (
          <span title="Chi phí Index (OpenAI)">
            {formatIndexCost(doc.indexEstimatedUsd)}
          </span>
        )}
      </div>
      {doc.errorMessage && (
        <div className="doc-card-error">{doc.errorMessage}</div>
      )}
      <div className="doc-actions">
        <button
          type="button"
          className="btn btn-parse"
          disabled={busy || !canParse(doc)}
          onClick={onParse}
        >
          {parseButtonLabel(doc.status)}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || !canIndex(doc)}
          onClick={onIndex}
        >
          {indexButtonLabel(doc.status)}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || !canViewMarkdown(doc)}
          onClick={onMarkdown}
        >
          MD
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || !canViewChunks(doc)}
          onClick={onChunks}
        >
          Chunks
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy || BUSY_STATUSES.has(doc.status)}
          onClick={onDelete}
        >
          {vi.common.delete}
        </button>
      </div>
    </article>
  );
}
