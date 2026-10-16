/**
 * Where to send someone after they log in, carried in the /login URL:
 * /login?next=/orders/12 (and &expired=1 when their session just ran out).
 */

// The saved token was rejected when the app started: the admin pages send the
// user to /login with the "session ended" message (public pages don't care).
let expiredOnStart = false;
export const markExpiredOnStart = () => {
  expiredOnStart = true;
};
export const sessionExpiredOnStart = () => expiredOnStart;

/** /login link that comes back to `path` after logging in. */
export function loginUrl(path: string, expired = false): string {
  const params = new URLSearchParams();
  if (path && path !== '/' && !path.startsWith('/login')) params.set('next', path);
  if (expired) params.set('expired', '1');
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
}

/** The ?next= page, only if it's a path in this app (never another site). */
export function nextPath(search: string): string {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/';
}

// Logged out on purpose: the panel goes to a plain /login, not back to the page
// they were on (another account logging in next may not be allowed there).
let loggedOut = false;
export const setLoggedOut = (value: boolean) => {
  loggedOut = value;
};
export const isLoggedOut = () => loggedOut;
