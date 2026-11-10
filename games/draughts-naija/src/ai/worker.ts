import { handleRequest, isRequest } from './protocol';

/**
 * The AI Web Worker: a thin wrapper around the pure `handleRequest`. It holds no state between
 * messages, so terminating it at any moment loses nothing. Keep this file free of DOM and core
 * imports: it is bundled on its own and must stay tiny.
 */
/** The part of the worker global scope this file uses (no `webworker` lib: it would clash with `dom`). */
interface WorkerScope {
  onmessage: ((e: { data: unknown }) => void) | null;
  postMessage(m: unknown): void;
}
const scope = self as unknown as WorkerScope;
scope.onmessage = (e): void => {
  if (isRequest(e.data)) scope.postMessage(handleRequest(e.data));
};
