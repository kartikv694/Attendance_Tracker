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

    return originalFetch(input, { ...init, headers });
  };
}

install();
