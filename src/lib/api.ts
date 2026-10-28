import axios from 'axios';

import { loginUrl } from './session';

export const TOKEN_STORAGE_KEY = 'medsend_token';

/**
 * The token lives in localStorage: every tab shares the session and it survives
 * closing the browser, until the token expires (24 h). AuthProvider mirrors a
 * login/logout in one tab to the others.
 * (sessionStorage is still read once: tabs logged in before this change.)
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  clearToken();
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Absolute URL for a file served by the API (e.g. "/uploads/pod/…"); full URLs pass through. */
export function fileUrl(path: string): string {
  return new URL(path, api.defaults.baseURL).href;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Handle a 401 yourself instead of being sent to the login page. */
    skipAuthRedirect?: boolean;
  }
}

let redirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 on a request that carried a token = the session ran out (expired,
    // or the account was changed): back to the login page, then to this page.
    // A 401 without a token (e.g. a wrong password on the login form) is just an error.
    const hadToken = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadToken && !error.config?.skipAuthRedirect) {
      clearToken();
      if (!redirecting && !window.location.pathname.startsWith('/login')) {
        redirecting = true; // several requests can fail at once; redirect only once
        const here = window.location.pathname + window.location.search;
        window.location.href = loginUrl(here, true);
      }
    }
    return Promise.reject(error);
  },
);

/** Ambil pesan error dari response {"error": "..."} milik backend Go. */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { error?: string } | undefined)?.error;
    if (msg) return msg;
  }
  return fallback;
}
