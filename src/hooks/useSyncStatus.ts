import { useEffect, useRef, useState } from "react";
import { onSync, type SyncEvent } from "../lib/syncBus";

export type SyncState =
  | "hidden"
  | "offline"
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "guest";

type Args = { pendingCount: number; signedIn: boolean };

export function useSyncStatus({ pendingCount, signedIn }: Args): SyncState {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [event, setEvent] = useState<SyncEvent | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    return onSync((e) => {
      window.clearTimeout(timer.current);
      setEvent(e);
      // Only the reassuring ones time out. offline and failed stay put until
      // the state actually changes.
      if (e === "synced") timer.current = window.setTimeout(() => setEvent(null), 3000);
      if (e === "guest") timer.current = window.setTimeout(() => setEvent(null), 5000);
    });
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!online) return "offline";
  if (event === "syncing") return "syncing";
  if (event === "synced") return "synced";
  if (event === "failed") return "failed";
  if (event === "guest") return "guest";
  if (signedIn && pendingCount > 0) return "pending";
  return "hidden";
}
