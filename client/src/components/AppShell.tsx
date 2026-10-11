import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../api/hooks';
import { ApiError } from '../api/client';

// Wraps every logged-in page. Sends anyone without a session to the login screen.
export function RequireAuth() {
  const me = useMe();

  if (me.isPending) {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading…</div>;
  }
  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center text-sm text-warn">
        We could not reach the server. Check your connection and refresh.
      </div>
    );
  }
  return <Outlet />;
}

export function AppShell() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const user = me.data;

  async function onLogout() {
    await logout.mutateAsync().catch(() => undefined);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">
            Fixtrail
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted sm:inline">
                {user.name} · {user.role === 'staff' ? 'Service worker' : 'Resident'}
              </span>
            )}
            <button
              onClick={onLogout}
              className="rounded-lg px-3 py-1.5 text-sm text-accent transition-colors duration-150 ease-out hover:bg-accent-soft"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
