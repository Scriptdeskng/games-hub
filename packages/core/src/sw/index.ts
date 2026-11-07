/**
 * Registers the per-game service worker (`sw.js` generated next to index.html at build time).
 * Never throws and never blocks: if registration is refused (private mode, third-party iframe
 * storage rules, file://), the game simply keeps loading online.
 */
export type SwResult = 'registered' | 'unsupported' | 'skipped' | 'failed';

export function swUrl(baseURI: string): string {
  const u = new URL(baseURI);
  const last = u.pathname.split('/').pop() ?? '';
  if (last && !last.includes('.')) u.pathname += '/';
  return new URL('sw.js', u).href;
}

export async function registerServiceWorker(): Promise<SwResult> {
  if (import.meta.env.DEV) return 'skipped'; // Vite dev server has no sw.js
  if (!('serviceWorker' in navigator)) return 'unsupported';
  try {
    await navigator.serviceWorker.register(swUrl(document.baseURI));
    return 'registered';
  } catch {
    return 'failed';
  }
}
