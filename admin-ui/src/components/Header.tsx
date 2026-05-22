import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useHealth } from '../hooks/useHealth';
import { vi } from '../lib/vi';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { health, apiOffline, offlineMessage } = useHealth();

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="header">
        <div className="layout-inner header-inner">
        <div className="header-brand">
          <div className="header-logo" aria-hidden>
            M
          </div>
          <div>
            <h1 className="header-title">Knowledge Admin</h1>
            <span className="header-sub">MinerU · RAG</span>
          </div>
        </div>

        <nav className="header-nav" aria-label={vi.nav.navAria}>
          <NavLink to="/" end>
            {vi.nav.dashboard}
          </NavLink>
          <NavLink to="/documents">{vi.nav.documents}</NavLink>
          <NavLink to="/rag">{vi.nav.testRag}</NavLink>
          <NavLink to="/api-keys">{vi.nav.apiKeys}</NavLink>
          <NavLink to="/users">{vi.nav.users}</NavLink>
        </nav>

        <div className="header-user hidden-mobile">
          <span className="header-user-email" title={user?.email ?? ''}>
            {user?.displayName ?? user?.email}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            {vi.nav.logout}
          </button>
        </div>

        <div className="header-status">
          <span className={`status-pill ${apiOffline ? 'bad' : 'ok'}`}>
            <span className="status-dot" />
            API
          </span>
          <span
            className={`status-pill ${
              health?.checks.database === 'ok' ? 'ok' : 'bad'
            }`}
          >
            <span className="status-dot" />
            DB
          </span>
          <span
            className={`status-pill ${
              health?.checks.mineru === 'ok' ? 'ok' : 'bad'
            }`}
          >
            <span className="status-dot" />
            MinerU
          </span>
        </div>

        <button
          type="button"
          className="menu-btn"
          aria-label={vi.nav.menu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        </div>
      </header>

      <div
        className={`mobile-drawer ${menuOpen ? 'open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-drawer-backdrop" onClick={closeMenu} />
        <div className="mobile-drawer-panel">
          <NavLink to="/" end onClick={closeMenu}>
            {vi.nav.dashboard}
          </NavLink>
          <NavLink to="/documents" onClick={closeMenu}>
            {vi.nav.documents}
          </NavLink>
          <NavLink to="/rag" onClick={closeMenu}>
            {vi.nav.testRag}
          </NavLink>
          <NavLink to="/api-keys" onClick={closeMenu}>
            {vi.nav.apiKeys}
          </NavLink>
          <NavLink to="/users" onClick={closeMenu}>
            {vi.nav.users}
          </NavLink>
          <div className="mobile-drawer-status">
            <span className={`status-pill ${apiOffline ? 'bad' : 'ok'}`}>
              <span className="status-dot" /> API {apiOffline ? 'offline' : 'ok'}
            </span>
            <span
              className={`status-pill ${
                health?.checks.database === 'ok' ? 'ok' : 'bad'
              }`}
            >
              <span className="status-dot" /> DB
            </span>
            <span
              className={`status-pill ${
                health?.checks.mineru === 'ok' ? 'ok' : 'bad'
              }`}
            >
              <span className="status-dot" /> MinerU
            </span>
          </div>
          {apiOffline && (
            <p style={{ fontSize: '0.75rem', color: 'var(--error)', margin: 0 }}>
              {offlineMessage}
            </p>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: '0.5rem' }}
            onClick={() => {
              closeMenu();
              logout();
            }}
          >
            {vi.nav.logout}
          </button>
        </div>
      </div>
    </>
  );
}
