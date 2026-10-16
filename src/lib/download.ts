import { api } from '@/lib/api';

/**
 * Downloads a file from the API (e.g. an Excel export) through axios, so the
 * auth header is sent, then saves the blob under the name from
 * Content-Disposition. API errors come back as a Blob too; their {"error"}
 * message is rethrown.
 */
export async function downloadFromApi(path: string, params: Record<string, string>, fallbackName: string) {
  try {
    const res = await api.get<Blob>(path, { params, responseType: 'blob' });
    const disposition = String(res.headers['content-disposition'] ?? '');
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  } catch (err) {
    const blob = (err as { response?: { data?: unknown } }).response?.data;
    if (blob instanceof Blob) {
      const message = await blob
        .text()
        .then((t) => (JSON.parse(t) as { error?: string }).error)
        .catch(() => undefined);
      if (message) throw new Error(message);
    }
    throw err;
  }
}
