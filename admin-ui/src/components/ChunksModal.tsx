import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { vi } from '../lib/vi';

type Chunk = {
  id: string;
  chunkIndex: number;
  blockType: string;
  content: string;
  pageIdx: number | null;
  headingPath: string | null;
  tokenCount: number | null;
};

type Props = {
  documentId: string;
  title: string;
  onClose: () => void;
};

export function ChunksModal({ documentId, title, onClose }: Props) {
  const [items, setItems] = useState<Chunk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listChunks(documentId, 200);
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : vi.chunks.loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-chunks">
        <div className="modal-header">
          <h2 className="modal-title">Chunks: {title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label={vi.common.close}
          >
            x
          </button>
        </div>
        <div className="modal-body">
          {loading && (
            <div className="empty-state">
              <div className="spinner" />
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && (
            <>
              <p className="chunks-summary">
                {vi.chunks.summary(total, items.length)}
              </p>
              <div className="chunks-list">
                {items.map((c) => (
                  <article key={c.id} className="chunk-item">
                    <div className="chunk-item-meta">
                      <span>#{c.chunkIndex}</span>
                      <span>{c.blockType}</span>
                      {c.pageIdx != null && (
                        <span>{vi.chunks.page(c.pageIdx + 1)}</span>
                      )}
                      {c.tokenCount != null && <span>{c.tokenCount} tok</span>}
                    </div>
                    {c.headingPath && (
                      <div className="chunk-heading">{c.headingPath}</div>
                    )}
                    <pre className="chunk-text">{c.content}</pre>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
