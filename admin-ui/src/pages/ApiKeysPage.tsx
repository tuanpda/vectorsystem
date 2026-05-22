import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

type ApiKeyRow = {
  id: string;
  name: string;
  tenantId: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  creator: { email: string; displayName: string | null } | null;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Chatbot');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const items = await api.listApiKeys();
      setKeys(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await api.createApiKey(name.trim());
      setNewSecret(res.secret);
      setName('Chatbot');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo key thất bại');
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string, label: string) => {
    if (!confirm(`Thu hồi key "${label}"? Bot dùng key này sẽ không gọi được RAG.`)) {
      return;
    }
    try {
      await api.revokeApiKey(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thu hồi thất bại');
    }
  };

  const copySecret = async () => {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
  };

  return (
    <>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">API Key cho Bot</h2>
        </div>
        <p className="api-keys-intro">
          Tạo key một lần, gắn vào app chatbot. Key chỉ dùng được{' '}
          <code>POST /api/v1/rag/query</code> — không upload/parse/index.
        </p>

        <form className="api-keys-form" onSubmit={onCreate}>
          <div className="api-keys-form-row">
            <input
              className="input"
              placeholder="Tên key (vd: Chatbot Zalo)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button type="submit" className="btn" disabled={creating}>
              {creating ? 'Đang tạo…' : 'Tạo API key'}
            </button>
          </div>
        </form>
      </section>

      {newSecret && (
        <div className="alert alert-warn api-keys-secret-box" role="status">
          <strong>Lưu key ngay — chỉ hiện một lần:</strong>
          <code className="api-keys-secret">{newSecret}</code>
          <div className="api-keys-secret-actions">
            <button type="button" className="btn btn-sm" onClick={copySecret}>
              Copy
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setNewSecret(null)}
            >
              Đã lưu, đóng
            </button>
          </div>
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Key đang hoạt động</h2>
          <span className="card-count">{keys.length}</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : keys.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có API key. Tạo key ở trên để bot gọi RAG.</p>
          </div>
        ) : (
          <ul className="api-keys-list">
            {keys.map((k) => (
              <li key={k.id} className="api-keys-item">
                <div>
                  <strong>{k.name}</strong>
                  <span className="api-keys-meta">
                    {k.keyPrefix}… · {k.tenantId} ·{' '}
                    {k.scopes.join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => onRevoke(k.id, k.name)}
                >
                  Thu hồi
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card api-keys-docs">
        <h3 className="card-title">Bot gọi API như thế nào?</h3>
        <pre className="api-keys-code">{`curl -X POST http://127.0.0.1:3000/api/v1/rag/query \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: mk_live_..." \\
  -d '{"question":"Tóm tắt tài liệu 494?","topK":8}'`}</pre>
        <p className="api-keys-hint">
          Hoặc <code>Authorization: Bearer mk_live_...</code>. Response trả{' '}
          <code>contexts</code> — app bot tự ghép prompt và gọi LLM.
        </p>
      </section>
    </>
  );
}
