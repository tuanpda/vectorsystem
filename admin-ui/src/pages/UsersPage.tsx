import { FormEvent, useCallback, useEffect, useState } from 'react';

import { api } from '../api/client';

import { useAuth } from '../auth/AuthContext';

import { vi } from '../lib/vi';



type UserRow = {

  id: string;

  email: string;

  displayName: string | null;

  role: string;

  createdAt: string;

};



export default function UsersPage() {

  const { user: me } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [displayName, setDisplayName] = useState('');

  const [creating, setCreating] = useState(false);



  const refresh = useCallback(async () => {

    try {

      setUsers(await api.listUsers());

      setError(null);

    } catch (e) {

      setError(e instanceof Error ? e.message : vi.common.listLoadError);

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

      await api.createUser(email, password, displayName || undefined);

      setEmail('');

      setPassword('');

      setDisplayName('');

      await refresh();

    } catch (err) {

      setError(err instanceof Error ? err.message : vi.users.createFailed);

    } finally {

      setCreating(false);

    }

  };



  const onDelete = async (u: UserRow) => {

    if (!confirm(vi.users.confirmDelete(u.email))) return;

    try {

      await api.deleteUser(u.id);

      await refresh();

    } catch (err) {

      setError(err instanceof Error ? err.message : vi.users.deleteFailed);

    }

  };



  const onResetPassword = async (u: UserRow) => {

    const pwd = prompt(vi.users.resetPasswordPrompt(u.email));

    if (!pwd || pwd.length < 6) return;

    try {

      await api.updateUser(u.id, { password: pwd });

      alert(vi.users.passwordChanged);

    } catch (err) {

      setError(err instanceof Error ? err.message : vi.users.resetFailed);

    }

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

          <h2 className="card-title">{vi.users.addTitle}</h2>

        </div>

        <form className="users-form" onSubmit={onCreate}>

          <input

            className="input"

            type="email"

            placeholder="Email"

            value={email}

            onChange={(e) => setEmail(e.target.value)}

            required

          />

          <input

            className="input"

            type="password"

            placeholder={vi.users.password}

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            required

            minLength={6}

          />

          <input

            className="input"

            type="text"

            placeholder={vi.users.displayNamePlaceholder}

            value={displayName}

            onChange={(e) => setDisplayName(e.target.value)}

          />

          <button type="submit" className="btn" disabled={creating}>

            {creating ? vi.users.creating : vi.users.create}

          </button>

        </form>

      </section>



      <section className="card">

        <div className="card-header">

          <h2 className="card-title">{vi.users.listTitle}</h2>

          <span className="card-count">{users.length}</span>

        </div>

        <ul className="users-list">

          {users.map((u) => (

            <li key={u.id} className="users-item">

              <div>

                <strong>{u.displayName ?? u.email}</strong>

                <span className="users-meta">

                  {u.email}

                  {u.id === me?.id ? ` ${vi.common.you}` : ''}

                </span>

              </div>

              <div className="users-actions">

                <button

                  type="button"

                  className="btn btn-sm btn-ghost"

                  onClick={() => onResetPassword(u)}

                >

                  {vi.users.changePassword}

                </button>

                <button

                  type="button"

                  className="btn btn-sm btn-danger"

                  disabled={u.id === me?.id}

                  onClick={() => onDelete(u)}

                >

                  {vi.common.delete}

                </button>

              </div>

            </li>

          ))}

        </ul>

      </section>

    </>

  );

}

