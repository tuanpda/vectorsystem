import { Document } from '../api/client';
import {
  BUSY_STATUSES,
  canIndex,
  canParse,
  canViewChunks,
  canViewMarkdown,
} from '../lib/docActions';
import {
  formatIndexCost,
  indexButtonLabel,
  parseButtonLabel,
  vi,
} from '../lib/vi';
import { StatusBadge } from './StatusBadge';

type Props = {
  docs: Document[];
  actionId: string | null;
  onParse: (id: string) => void;
  onIndex: (id: string) => void;
  onMarkdown: (id: string) => void;
  onChunks: (id: string) => void;
  onDelete: (id: string, title: string) => void;
};

export function DocumentsTable({
  docs,
  actionId,
  onParse,
  onIndex,
  onMarkdown,
  onChunks,
  onDelete,
}: Props) {
  return (
    <div className="doc-table-panel">
      <div className="doc-table-scroll" tabIndex={0} role="region" aria-label={vi.documents.libraryTitle}>
        <table className="doc-table">
          <thead>
            <tr>
              <th className="th-doc">{vi.documents.colDocument}</th>
              <th className="th-status">{vi.documents.colStatus}</th>
              <th className="th-num">{vi.documents.colChunks}</th>
              <th className="th-num">{vi.documents.colCost}</th>
              <th className="th-actions">{vi.documents.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const busy = actionId === d.id;
              return (
                <tr key={d.id} className={busy ? 'is-busy' : undefined}>
                  <td className="td-doc">
                    <div className="doc-row-name" title={d.title}>
                      {d.title}
                    </div>
                    <div className="doc-row-file" title={d.originalName}>
                      {d.originalName}
                    </div>
                  </td>
                  <td className="td-status">
                    <StatusBadge status={d.status} />
                    {d.errorMessage && (
                      <p className="doc-row-err" title={d.errorMessage}>
                        {d.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="td-num">{d.chunkCount}</td>
                  <td className="td-num td-cost">
                    <span className="doc-cost-val">
                      {formatIndexCost(d.indexEstimatedUsd)}
                    </span>
                    {d.indexPromptTokens != null && d.indexPromptTokens > 0 && (
                      <span className="doc-cost-tok">
                        {d.indexPromptTokens.toLocaleString()} tok
                      </span>
                    )}
                  </td>
                  <td className="td-actions">
                    <div className="doc-act-bar">
                      <div className="doc-act-group doc-act-group--main">
                        <button
                          type="button"
                          className="doc-act doc-act--primary"
                          disabled={busy || !canParse(d)}
                          onClick={() => onParse(d.id)}
                          title={vi.documents.parseAgainTitle}
                        >
                          {parseButtonLabel(d.status)}
                        </button>
                        <button
                          type="button"
                          className="doc-act doc-act--primary-soft"
                          disabled={busy || !canIndex(d)}
                          onClick={() => onIndex(d.id)}
                          title={vi.documents.indexAgainTitle}
                        >
                          {indexButtonLabel(d.status)}
                        </button>
                      </div>
                      <div className="doc-act-group">
                        <button
                          type="button"
                          className="doc-act"
                          disabled={busy || !canViewMarkdown(d)}
                          onClick={() => onMarkdown(d.id)}
                          title="Markdown"
                        >
                          MD
                        </button>
                        <button
                          type="button"
                          className="doc-act"
                          disabled={busy || !canViewChunks(d)}
                          onClick={() => onChunks(d.id)}
                          title="Chunks"
                        >
                          Chunks
                        </button>
                      </div>
                      <button
                        type="button"
                        className="doc-act doc-act--danger"
                        disabled={busy || BUSY_STATUSES.has(d.status)}
                        onClick={() => onDelete(d.id, d.title)}
                        title={vi.common.delete}
                      >
                        {vi.common.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
