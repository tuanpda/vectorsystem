import { useEffect, useState } from 'react';
import { api, Document } from '../api/client';
import { vi } from '../lib/vi';

export default function RagPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof api.ragQuery>
  > | null>(null);

  useEffect(() => {
    api
      .listDocuments()
      .then((r) => {
        const indexed = r.items.filter((d) => d.status === 'indexed');
        setDocs(indexed);
        setSelected(indexed.map((d) => d.id));
      })
      .catch(() => setDocs([]));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.ragQuery(
        question.trim(),
        selected.length ? selected : undefined,
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tìm kiếm thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="alert alert-info">
        Mô phỏng <strong>bot app</strong>: API trả về các đoạn liên quan — bot
        của bạn gọi <code>POST /api/v1/rag/query</code> rồi đưa vào LLM.
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">{vi.rag.title}</h2>
        </div>
        <form className="rag-form" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="rag-q">
              Câu hỏi
            </label>
            <textarea
              id="rag-q"
              className="textarea"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="VD: Linear Regression và testing error trong tài liệu?"
            />
          </div>

          <div>
            <label className="label">
              {vi.rag.indexedDocs(selected.length, docs.length)}
            </label>
            {docs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                {vi.rag.noIndexed}
              </p>
            ) : (
              <div className="doc-check-list">
                {docs.map((d) => (
                  <label key={d.id} className="doc-check-item">
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggle(d.id)}
                    />
                    <span>
                      <span className="doc-check-label">{d.title}</span>
                      <span className="doc-check-meta">
                        {' '}
                        · {d.chunkCount} chunks
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-block"
            disabled={loading || !question.trim()}
          >
            {loading ? 'Đang tìm kiếm…' : 'Tìm kiếm ngữ nghĩa'}
          </button>
        </form>
      </section>

      {result && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Kết quả</h2>
            <span className="card-count">{result.contexts.length} đoạn</span>
          </div>
          <div className="rag-results">
            {result.contexts.map((ctx, i) => (
              <article key={i} className="rag-hit">
                <div className="rag-hit-meta">
                  <span className="rag-score">
                    {(ctx.score * 100).toFixed(1)}% khớp
                  </span>
                  <span>{ctx.blockType}</span>
                  <span>Trang {ctx.citation.page ?? '—'}</span>
                  <span>{ctx.documentTitle}</span>
                </div>
                <div className="rag-hit-text">{ctx.text}</div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
