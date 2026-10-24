import React, { useEffect, useState } from "react";
import { WifiOff, CloudOff } from "lucide-react";
import { isServerDown } from "../../lib/serverStatus";
import { outboxCount } from "../../lib/outbox";

// v333 (Ravi: "net nahi ho tab bhi chale, app already loaded show ho" — App Store 4.2 / Play): a calm pill at
// the top while the phone is offline. Screens keep showing what was loaded last time (lib/api.js offline
// fallback); this says so, and disappears by itself when the internet is back.
// v364 (Ravi: "website band ki update ke liye toh pura error show hone laga"): same pill while the Ybex server is
// updating ("Ybex is updating · showing your last saved screens"), the number of saves waiting on the phone
// (src/lib/outbox.js) and a short "Synced ✓" once they reached Ybex.
const waitingText = (n) => (n > 0 ? ` · ${n} change${n === 1 ? "" : "s"} waiting to sync` : "");

export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [serverDown, setServerDown] = useState(() => isServerDown());
  const [stale, setStale] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const [waiting, setWaiting] = useState(() => outboxCount());
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    let t = 0, t2 = 0;
    const off = () => { setOffline(true); setBackOnline(false); };
    const on = () => { setOffline(false); setStale(false); setBackOnline(true); clearTimeout(t); t = setTimeout(() => setBackOnline(false), 2500); };
    const old = () => setStale(true);
    const server = (e) => {
      const down = Boolean(e?.detail?.down);
      setServerDown(down);
      if (!down) { setStale(false); setBackOnline(true); clearTimeout(t); t = setTimeout(() => setBackOnline(false), 2500); }
    };
    const box = (e) => setWaiting(Number(e?.detail?.count ?? outboxCount()) || 0);
    const done = () => { setSynced(true); clearTimeout(t2); t2 = setTimeout(() => setSynced(false), 2500); };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    window.addEventListener("ybex:offline-data", old);
    window.addEventListener("ybex:server", server);
    window.addEventListener("ybex:outbox", box);
    window.addEventListener("ybex:outbox-synced", done);
    return () => {
      window.removeEventListener("offline", off); window.removeEventListener("online", on); window.removeEventListener("ybex:offline-data", old);
      window.removeEventListener("ybex:server", server); window.removeEventListener("ybex:outbox", box); window.removeEventListener("ybex:outbox-synced", done);
      clearTimeout(t); clearTimeout(t2);
    };
  }, []);
  const syncedNow = synced && !offline && !serverDown && waiting === 0;
  if (!offline && !serverDown && !stale && !backOnline && !syncedNow && waiting === 0) return null;
  const good = (backOnline || syncedNow) && !offline && !serverDown;
  const text = good
    ? (syncedNow ? "Synced ✓ — your changes are saved on Ybex" : `Back online${waitingText(waiting)}`)
    : offline ? `You're offline · showing your last saved screens${waitingText(waiting)}`
    : serverDown ? `Ybex is updating · showing your last saved screens${waitingText(waiting)}`
    : stale ? "Connection is slow · showing saved data"
    : `Syncing${waitingText(waiting)}`;
  return (
    <div role="status" aria-live="polite" data-testid="offline-banner"
      style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", top: "calc(env(safe-area-inset-top, 0px) + 8px)", zIndex: 3000,
        display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(100vw - 24px)", padding: "8px 14px", borderRadius: 999,
        background: good ? "#ECFDF5" : "#1F1B2E", color: good ? "#047857" : "#FFFFFF", boxShadow: "0 10px 30px -12px rgba(15,11,31,.45)",
        font: "600 12.5px/1.3 'DM Sans', sans-serif", pointerEvents: "none" }}>
      {good ? <span aria-hidden="true">✓</span> : serverDown && !offline ? <CloudOff size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
    </div>
  );
}
