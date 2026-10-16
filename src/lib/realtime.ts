import { api, getToken } from '@/lib/api';
import type { OrderEvent } from '@/types/models';

type Status = 'connecting' | 'open' | 'closed';

/**
 * Listens to the API's Server-Sent Events stream (GET /api/events).
 *
 * Uses fetch instead of EventSource so the login token goes in the
 * Authorization header (EventSource can't set headers, and a token in the URL
 * ends up in server/proxy logs). Reconnects automatically with a short delay.
 * Returns a function that stops listening.
 */
export function listenToOrderEvents(
  onOrderEvent: (event: OrderEvent) => void,
  onStatus?: (status: Status) => void,
): () => void {
  const controller = new AbortController();
  let retryMs = 3000;

  const run = async () => {
    while (!controller.signal.aborted) {
      const token = getToken();
      if (!token) return;
      onStatus?.('connecting');
      try {
        const res = await fetch(`${api.defaults.baseURL}/events`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
          cache: 'no-store',
        });
        // Logged out / no access: stop instead of hammering the server.
        if (res.status === 401 || res.status === 403) break;
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        onStatus?.('open');
        retryMs = 3000;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          // Events are separated by a blank line.
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            let type = 'message';
            let data = '';
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) type = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if ((type === 'order.created' || type === 'order.status') && data) {
              try {
                onOrderEvent(JSON.parse(data) as OrderEvent);
              } catch {
                // Ignore a malformed frame rather than dropping the connection.
              }
            }
          }
        }
      } catch {
        if (controller.signal.aborted) break;
      }
      onStatus?.('closed');
      await new Promise((r) => setTimeout(r, retryMs));
      retryMs = Math.min(retryMs * 2, 30_000);
    }
    onStatus?.('closed');
  };

  void run();
  return () => controller.abort();
}

let audio: AudioContext | null = null;

/** Short two-tone "ting" (Web Audio, no sound file needed). */
export function playNotificationSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(audio!.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Audio blocked until the user interacts with the page — the toast still shows.
  }
}
