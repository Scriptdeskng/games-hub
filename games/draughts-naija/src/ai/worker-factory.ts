import type { WorkerLike } from './client';

/**
 * The only place that names the worker file. Vite recognises exactly this form
 * (`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`), bundles
 * worker.ts as its own file in the build output and fingerprints it. It throws where workers (or
 * module workers) are not supported; the client then falls back to the main thread.
 */
export const createAiWorker = (): WorkerLike =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
