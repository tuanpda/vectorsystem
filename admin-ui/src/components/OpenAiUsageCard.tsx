import { vi } from '../lib/vi';

export type OpenAiUsageSummary = {
  provider: string;
  model: string;
  trackingEnabled: boolean;
  note: string;
  month: {
    label: string;
    requests: number;
    promptTokens: number;
    totalTokens: number;
    estimatedUsd: number;
    estimatedUsdFormatted: string;
  };
  allTime: {
    requests: number;
    totalTokens: number;
    estimatedUsd: number;
    estimatedUsdFormatted: string;
  };
  byOperation: {
    operation: string;
    label: string;
    requests: number;
    totalTokens: number;
    estimatedUsd: number;
    estimatedUsdFormatted: string;
  }[];
  topDocumentsThisMonth: {
    documentId: string | null;
    title: string | null;
    indexRuns: number;
    totalTokens: number;
    estimatedUsd: number;
    estimatedUsdFormatted: string;
  }[];
  billing: {
    available: boolean;
    message: string;
    monthSpendUsd?: number;
    monthSpendFormatted?: string;
  } | null;
  pricePer1MTokens?: number;
};

type Props = {
  usage: OpenAiUsageSummary | null | undefined;
  loading?: boolean;
};

export function OpenAiUsageCard({ usage, loading }: Props) {
  if (loading) {
    return (
      <section className="card">
        <h2 className="card-title">{vi.usage.title}</h2>
        <p className="dash-stat-hint">{vi.common.loading}</p>
      </section>
    );
  }

  if (!usage) {
    return (
      <section className="card">
        <h2 className="card-title">{vi.usage.title}</h2>
        <p className="usage-note">{vi.usage.ollamaNote}</p>
      </section>
    );
  }

  return (
    <section className="card usage-card">
      <div className="card-header">
        <h2 className="card-title">{vi.usage.title}</h2>
        <span className="usage-model-badge">
          {usage.model}
        </span>
      </div>
      <p className="usage-note">{usage.note}</p>

      <div className="usage-grid">
        <div className="usage-stat">
          <span className="usage-stat-label">{vi.usage.monthSpend}</span>
          <strong className="usage-stat-value">
            {usage.month.estimatedUsdFormatted}
          </strong>
          <span className="usage-stat-meta">
            {usage.month.totalTokens.toLocaleString()} tokens ·{' '}
            {usage.month.requests} lần gọi
          </span>
        </div>
        <div className="usage-stat">
          <span className="usage-stat-label">{vi.usage.allTime}</span>
          <strong className="usage-stat-value">
            {usage.allTime.estimatedUsdFormatted}
          </strong>
          <span className="usage-stat-meta">
            {usage.allTime.totalTokens.toLocaleString()} tokens
          </span>
        </div>
        {usage.billing?.available && usage.billing.monthSpendFormatted && (
          <div className="usage-stat usage-stat-billing">
            <span className="usage-stat-label">{vi.usage.openAiBilling}</span>
            <strong className="usage-stat-value">
              {usage.billing.monthSpendFormatted}
            </strong>
            <span className="usage-stat-meta">{usage.billing.message}</span>
          </div>
        )}
      </div>

      {usage.billing && !usage.billing.available && (
        <p className="usage-billing-hint">{usage.billing.message}</p>
      )}

      <div className="usage-breakdown">
        <h3 className="usage-subtitle">{vi.usage.byStep}</h3>
        <ul className="usage-op-list">
          <li>
            <span>Upload</span>
            <span className="usage-free">{vi.usage.free}</span>
          </li>
          <li>
            <span>Parse (MinerU)</span>
            <span className="usage-free">{vi.usage.free}</span>
          </li>
          {usage.byOperation.map((row) => (
            <li key={row.operation}>
              <span>{row.label}</span>
              <span>
                {row.estimatedUsdFormatted} ·{' '}
                {row.totalTokens.toLocaleString()} tok
              </span>
            </li>
          ))}
          {usage.byOperation.length === 0 && (
            <li className="usage-empty">{vi.usage.noCallsYet}</li>
          )}
        </ul>
      </div>

      {usage.topDocumentsThisMonth.length > 0 && (
        <div className="usage-breakdown">
          <h3 className="usage-subtitle">{vi.usage.topDocsMonth}</h3>
          <ul className="usage-doc-list">
            {usage.topDocumentsThisMonth.map((d) => (
              <li key={d.documentId ?? d.title}>
                <span className="usage-doc-title">{d.title}</span>
                <span>{d.estimatedUsdFormatted}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
