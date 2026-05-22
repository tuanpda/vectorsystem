import { useCallback, useEffect, useState } from 'react';
import { api, API_OFFLINE_MSG, Document, isApiConnectionError } from '../api/client';
import { ChunksModal } from '../components/ChunksModal';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentsTable } from '../components/DocumentsTable';
import { MarkdownModal } from '../components/MarkdownModal';
import { Pagination } from '../components/Pagination';
import { UploadZone } from '../components/UploadZone';
import { BUSY_STATUSES } from '../lib/docActions';
import { DOC_STATUS_FILTER_OPTIONS, vi } from '../lib/vi';

const POLL_MS = 4000;
const PAGE_SIZE = 20;

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [chunksDoc, setChunksDoc] = useState<Document | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setPage(0);
  }, [searchQ, statusFilter]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listDocuments({
        q: searchQ || undefined,
        status: statusFilter || undefined,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      });
      const maxPage = Math.max(0, Math.ceil(res.total / PAGE_SIZE) - 1);
      if (page > maxPage && res.total > 0) {
        setPage(maxPage);
        return;
      }
      setDocs(res.items);
      setTotal(res.total);
      setError(null);
    } catch (e) {
      setError(
        isApiConnectionError(e)
          ? API_OFFLINE_MSG
          : e instanceof Error
            ? e.message
            : vi.common.listLoadError,
      );
    } finally {
      setLoading(false);
    }
  }, [searchQ, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      refresh();
    }, 300);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const hasBusy = docs.some((d) => BUSY_STATUSES.has(d.status));
    if (!hasBusy) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [docs, refresh]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await api.upload(file, title || undefined);
      }
      setTitle('');
      setPage(0);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : vi.common.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const runAction = async (id: string, fn: (id: string) => Promise<unknown>) => {
    setActionId(id);
    setError(null);
    try {
      await fn(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : vi.common.actionFailed);
    } finally {
      setActionId(null);
    }
  };

  const showMarkdown = async (id: string) => {
    setActionId(id);
    try {
      const res = await api.getMarkdown(id);
      setPreview(res.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : vi.documents.noMarkdown);
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <UploadZone
        title={title}
        onTitleChange={setTitle}
        uploading={uploading}
        onUpload={onUpload}
      />

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">{vi.documents.libraryTitle}</h2>
          <span className="card-count">{total}</span>
        </div>

        <div className="doc-filters">
          <input
            className="input"
            type="search"
            placeholder={vi.documents.searchPlaceholder}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <select
            className="input doc-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {DOC_STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>{vi.common.loading}</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>{vi.documents.empty}</p>
          </div>
        ) : (
          <>
            <div className="doc-list">
              {docs.map((d) => (
                <DocumentCard
                  key={d.id}
                  doc={d}
                  busy={actionId === d.id}
                  onParse={() => runAction(d.id, api.parse)}
                  onIndex={() => runAction(d.id, api.index)}
                  onMarkdown={() => showMarkdown(d.id)}
                  onChunks={() => setChunksDoc(d)}
                  onDelete={() => {
                    if (confirm(vi.documents.confirmDelete(d.title))) {
                      runAction(d.id, api.delete);
                    }
                  }}
                />
              ))}
            </div>

            <div className="doc-table-wrap">
              <DocumentsTable
                docs={docs}
                actionId={actionId}
                onParse={(id) => runAction(id, api.parse)}
                onIndex={(id) => runAction(id, api.index)}
                onMarkdown={showMarkdown}
                onChunks={(id) => {
                  const doc = docs.find((x) => x.id === id);
                  if (doc) setChunksDoc(doc);
                }}
                onDelete={(id, title) => {
                  if (confirm(vi.documents.confirmDelete(title))) {
                    runAction(id, api.delete);
                  }
                }}
              />
            </div>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      {preview && (
        <MarkdownModal content={preview} onClose={() => setPreview(null)} />
      )}
      {chunksDoc && (
        <ChunksModal
          documentId={chunksDoc.id}
          title={chunksDoc.title}
          onClose={() => setChunksDoc(null)}
        />
      )}
    </>
  );
}
