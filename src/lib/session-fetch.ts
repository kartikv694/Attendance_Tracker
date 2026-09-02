// Multi-tab sessions, explained:
//
// A cookie is shared by every tab/window of the same browser for a given
// origin - there is no such thing as a "tab-scoped cookie". That's why
// logging in as a different user in a second tab used to silently log out
// every other tab: they all shared the one session cookie.
//
// sessionStorage, on the other hand, genuinely IS scoped per tab - opening
// a brand new tab starts with empty sessionStorage, independent of any
// other open tab. So each tab now keeps its own copy of the session JWT
// in sessionStorage (see SESSION_TOKEN_KEY below, written on login), and
// this module patches window.fetch so every request this app makes
// automatically carries that tab's own token as a Bearer header - without
// having to touch every fetch() call across the codebase.
//
// This file is imported once for its side effect (see toast.tsx, the
// first client component evaluated under the root layout) and installs
// the patch at module-evaluation time, not inside a useEffect - effects
// run child-before-parent, so a page's own on-mount fetch could otherwise
// race ahead of the patch being installed.

export const SESSION_TOKEN_KEY = "session_token";

let patched = false;
const inFlightGets = new Map<string, Promise<Response>>();

function install() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const token = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) return originalFetch(input, init);

    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // never attach this tab's token to a request aimed at some other origin
    const isSameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);
    if (!isSameOrigin) return originalFetch(input, init);

    const headers = new Headers(
      init.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const method = (init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const requestInit = { ...init, headers };

    if (method === "GET" || method === "HEAD") {
      // React Strict Mode intentionally re-runs mount effects in development.
      // If that produces the exact same GET twice, keep one network request
      // and give each caller its own clone so both can safely call .json().
      const key = `${method}:${url}:${headers.get("Authorization") ?? ""}`;
      const existing = inFlightGets.get(key);
      if (existing) return existing.then((response) => response.clone());

      const request = originalFetch(input, requestInit).finally(() => {
        inFlightGets.delete(key);
      });
      inFlightGets.set(key, request);
      return request.then((response) => response.clone());
    }

    return originalFetch(input, requestInit);
  };
}

install();
