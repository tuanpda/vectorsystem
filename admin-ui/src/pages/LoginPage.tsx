import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isApiConnectionError, API_OFFLINE_MSG } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from
    ?.pathname;

  if (!authLoading && isAuthenticated) {
    return <Navigate to={from ?? '/documents'} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        isApiConnectionError(err)
          ? API_OFFLINE_MSG
          : err instanceof Error
            ? err.message
            : 'Đăng nhập thất bại',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden />
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">M</div>
          <h1>Knowledge Admin</h1>
          <p>Quản trị tài liệu · MinerU · RAG</p>
        </div>

        <form className="login-card" onSubmit={onSubmit}>
          <h2>Đăng nhập</h2>
          <p className="login-sub">
            Dùng tài khoản admin trong <code>api/.env</code>
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@local.dev"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-wrap">
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-block login-submit"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <p className="login-hint">
            Lần đầu chạy API tự tạo admin từ{' '}
            <strong>ADMIN_EMAIL</strong> / <strong>ADMIN_PASSWORD</strong>.
            Mặc định dev: <code>admin@local.dev</code> / <code>admin123</code>
          </p>
        </form>

        <p className="login-footer">MinerU Knowledge Platform</p>
      </div>
    </div>
  );
}
