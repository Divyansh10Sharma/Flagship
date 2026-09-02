export type SyncEvent = "syncing" | "synced" | "failed" | "guest";

type Listener = (e: SyncEvent) => void;

const listeners = new Set<Listener>();

export function emitSync(e: SyncEvent): void {
  for (const l of listeners) l(e);
}

export function onSync(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
