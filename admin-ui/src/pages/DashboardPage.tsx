import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { api, API_OFFLINE_MSG, isApiConnectionError } from '../api/client';

import { OpenAiUsageCard } from '../components/OpenAiUsageCard';
import { StatusBadge } from '../components/StatusBadge';

import { vi } from '../lib/vi';



const STATUS_ORDER = [

  'indexed',

  'parsed',

  'uploaded',

  'failed',

  'parsing',

  'indexing',

  'queued_parse',

  'queued_index',

];



type Stats = Awaited<ReturnType<typeof api.dashboardStats>>;



export default function DashboardPage() {

  const [stats, setStats] = useState<Stats | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);



  const load = useCallback(async () => {

    try {

      const data = await api.dashboardStats();

      setStats(data);

      setError(null);

    } catch (e) {

      setError(

        isApiConnectionError(e)

          ? API_OFFLINE_MSG

          : e instanceof Error

            ? e.message

            : vi.common.dashboardError,

      );

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    load();

    const t = setInterval(load, 30000);

    return () => clearInterval(t);

  }, [load]);



  const sys = stats?.system.checks;

  const mineruOffline = sys?.mineru !== 'ok';



  return (

    <>

      {error && (

        <div className="alert alert-error" role="alert">

          {error}

        </div>

      )}



      {mineruOffline && !loading && (

        <div className="alert alert-warn" role="status">

          {vi.dashboard.mineruOffline(sys?.mineruApiUrl ?? 'http://127.0.0.1:8000')}

        </div>

      )}



      <section className="dash-grid">

        <div className="dash-stat card">

          <span className="dash-stat-label">{vi.dashboard.documents}</span>

          <span className="dash-stat-value">

            {loading ? '—' : (stats?.documents.total ?? 0)}

          </span>

          <span className="dash-stat-hint">

            {loading

              ? vi.common.loading

              : vi.dashboard.readyForRag(stats?.documents.readyForRag ?? 0)}

          </span>

        </div>

        <div className="dash-stat card">

          <span className="dash-stat-label">Chunks</span>

          <span className="dash-stat-value">

            {loading ? '—' : (stats?.chunks.total ?? 0)}

          </span>

          <span className="dash-stat-hint">{vi.dashboard.chunksHint}</span>

        </div>

        <div className="dash-stat card">

          <span className="dash-stat-label">{vi.dashboard.errors}</span>

          <span className="dash-stat-value dash-stat-warn">

            {loading ? '—' : (stats?.documents.failed ?? 0)}

          </span>

          <span className="dash-stat-hint">{vi.dashboard.errorsHint}</span>

        </div>

        <div className="dash-stat card">

          <span className="dash-stat-label">{vi.dashboard.embedding}</span>

          <span className="dash-stat-value dash-stat-sm">

            {loading ? '—' : stats?.embedding.provider}

          </span>

          <span className="dash-stat-hint">

            {loading

              ? '…'

              : `${stats?.embedding.model} (${stats?.embedding.dimensions}d)`}

          </span>

        </div>

      </section>

      <OpenAiUsageCard usage={stats?.openaiUsage} loading={loading} />

      <section className="card">

        <div className="card-header">

          <h2 className="card-title">{vi.dashboard.systemStatus}</h2>

          <button

            type="button"

            className="btn btn-sm btn-ghost"

            onClick={() => {

              setLoading(true);

              load();

            }}

          >

            {vi.common.refresh}

          </button>

        </div>

        <div className="dash-health">

          <div

            className={`dash-health-item ${loading ? '' : sys?.database === 'ok' ? 'ok' : 'bad'}`}

          >

            <span>Database</span>

            <strong>{loading ? '…' : sys?.database}</strong>

          </div>

          <div

            className={`dash-health-item ${loading ? '' : mineruOffline ? 'bad' : 'ok'}`}

          >

            <span>MinerU</span>

            <strong>{loading ? '…' : sys?.mineru}</strong>

          </div>

          <div className="dash-health-item ok">

            <span>API</span>

            <strong>{loading ? '…' : stats?.system.status ?? 'ok'}</strong>

          </div>

        </div>

      </section>



      <section className="card">

        <div className="card-header">

          <h2 className="card-title">{vi.dashboard.byStatus}</h2>

          <Link to="/documents" className="btn btn-sm">

            {vi.dashboard.manageDocs}

          </Link>

        </div>

        {loading ? (

          <p className="dash-stat-hint">{vi.common.loading}</p>

        ) : (

          <ul className="dash-status-list">

            {STATUS_ORDER.filter(

              (s) => (stats?.documents.byStatus[s] ?? 0) > 0,

            ).map((s) => (

              <li key={s}>

                <StatusBadge status={s} />

                <span className="dash-status-count">

                  {stats?.documents.byStatus[s]}

                </span>

              </li>

            ))}

            {(stats?.documents.byStatus.parsed ?? 0) > 0 &&

              (stats?.documents.byStatus.indexed ?? 0) === 0 && (

                <li className="dash-parse-hint">{vi.dashboard.parseHint}</li>

              )}

          </ul>

        )}

      </section>

    </>

  );

}

