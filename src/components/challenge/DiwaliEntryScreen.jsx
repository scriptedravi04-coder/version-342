import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getChallengePublic } from "../../lib/challengeApi";
import { PAGE_PATH, PRIZE_POOL, HASHTAG, MENTION, datesFrom, entriesOpen, countdown, sponsorsFrom, prizesFrom } from "../../lib/diwaliChallenge";
import { StringLights, useNow } from "./ChallengeUi";
import { useDesignFonts } from "./Festive";

// v372 (Ravi: "app open hote hi Hopr ki tarah ek screen 3–5 second ke liye aaye jo apne aap hat jaye — offline HTML
// wali opening screen exact waisi"): design 2l "Full-screen app entry · Hopr-style invite poster". Right after the
// Ybex splash, once per app open, for creators while entries are open: saffron poster with the "Diwali · Creator
// Challenge" sign, "Win up to ₹1,00,000", the creators art, and a bottom panel with the live countdown (server dates),
// Join Challenge and Powered by (Admin → Challenge entries → Sponsors & prizes). It closes by itself after 5 seconds
// (thin bar at the top shows the time), or with X / Join.

export const SHOW_MS = 5000;
const SEEN_KEY = "ybx_dw_entry_seen";
const RYE = "'Rye', Georgia, serif";
const PJS = "'Plus Jakarta Sans', 'DM Sans', sans-serif";
const SKIP_PATHS = /^\/(challenge|offer|login|signup|app|onboarding|admin|account-status|legal|terms|privacy)/;

const seen = () => { try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ } };

const useFonts = useDesignFonts; // v372: shared font link (Rye + Plus Jakarta Sans)

/** Pure: should the poster open now? */
export function shouldShowEntry({ user, path, pub, now, alreadySeen }) {
  if (alreadySeen || !user || user.role !== "creator") return false;
  if (SKIP_PATHS.test(path || "")) return false;
  if (!pub || pub.phase === "results") return false;
  return entriesOpen(now, datesFrom(pub));
}

export default function DiwaliEntryScreen() {
  const { user, loading } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [pub, setPub] = useState(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const tried = useRef(false);
  const now = useNow(1000);
  useFonts();

  useEffect(() => {
    // v373 deep test: someone who already opened the offer page this session doesn't need the poster — it used to pop
    // up over "Add collabs" right after "Yes, add my reel" and send them back to /challenge.
    if (/^\/(challenge|offers?)(\/|$)/.test(location.pathname)) markSeen();
    if (loading || tried.current || seen() || user?.role !== "creator" || SKIP_PATHS.test(location.pathname)) return undefined;
    tried.current = true;
    let alive = true;
    let started = false;
    const start = async () => {
      started = true;
      const d = await getChallengePublic().catch(() => null);
      if (!alive || /[?&]add=1\b/.test(window.location.search) || !shouldShowEntry({ user, path: window.location.pathname, pub: d, now: Date.now(), alreadySeen: seen() })) return;
      markSeen(); setPub(d); setOpen(true);
    };
    // after the Ybex splash (index.html) is gone
    if (document.getElementById("yb-splash")) {
      const go = () => { window.removeEventListener("ybex:splash-done", go); setTimeout(start, 150); };
      window.addEventListener("ybex:splash-done", go);
      // v373 deep test: a page change while waiting used to cancel the wait for good (tried stayed true) — try again
      return () => { alive = false; window.removeEventListener("ybex:splash-done", go); if (!started) tried.current = false; };
    }
    const t = setTimeout(start, 400);
    return () => { alive = false; clearTimeout(t); if (!started) tried.current = false; };
  }, [loading, user?.role, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setClosing(true); setTimeout(() => { setOpen(false); setClosing(false); }, 260); };
  useEffect(() => {
    if (!open) return undefined;
    window.__ybFullScreenAsk = true; // promo popups wait (PromoPopup otherPopupUp)
    const t = setTimeout(close, SHOW_MS);
    return () => { clearTimeout(t); window.__ybFullScreenAsk = false; };
  }, [open]);

  if (!open || !pub) return null;
  const dates = datesFrom(pub);
  const left = countdown(dates.closesAt - now);
  const amount = (/₹[\d,]+/.exec(String(pub?.config?.pool || PRIZE_POOL)) || ["₹1,00,000"])[0];
  const first = prizesFrom(pub?.config)?.[0];
  const firstLine = first?.value && !/to be announced/i.test(first.value) ? `1st prize: ${first.value}` : "1st prize: To be announced";
  const sponsors = sponsorsFrom(pub?.config).slice(0, 4);
  const join = () => { close(); navigate(PAGE_PATH); };
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div role="dialog" aria-modal="true" aria-label="Diwali Creator Challenge" data-testid="diwali-entry-screen"
      onClick={join}
      style={{ position: "fixed", inset: 0, zIndex: 9990, overflow: "hidden", cursor: "pointer", opacity: closing ? 0 : 1, transform: closing ? "scale(1.02)" : "none", transition: "opacity 260ms ease, transform 260ms ease",
        background: "radial-gradient(circle at 50% 40%, #fff 0, #FFFDF7 16%, #FFE2B8 28%, #FF9A3D 46%, #F0501E 66%, #B8141F 100%)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-radial-gradient(circle at 50% 40%, rgba(255,255,255,0) 0, rgba(255,255,255,0) 18px, rgba(255,255,255,.16) 18px, rgba(255,255,255,.16) 20px)" }} />
      {/* time bar (Hopr-style) */}
      <div aria-hidden="true" style={{ position: "absolute", left: 16, right: 16, top: "calc(8px + env(safe-area-inset-top))", height: 3, borderRadius: 2, background: "rgba(255,255,255,.35)", overflow: "hidden", zIndex: 3 }}>
        <div style={{ height: "100%", background: "#fff", animation: `ybxDwBar ${SHOW_MS}ms linear forwards` }} />
      </div>
      {/* v373 deep test (360×640 phone): the creators art covered "Win up to ₹1,00,000" — it now takes only the space left
          between the prize lines and the bottom panel (gone on very short screens), and the text sits above it */}
      <style>{"@keyframes ybxDwBar{from{width:0}to{width:100%}}.ybx-dw-art{height:min(230px,30vh)}@supports (height:100dvh){.ybx-dw-art{height:clamp(0px,calc(100dvh - 575px - env(safe-area-inset-top)),230px)}}"}</style>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: "calc(18px + env(safe-area-inset-top))", height: 40 }}><StringLights className="absolute inset-0 w-full h-10" count={16} /></div>
      <button type="button" aria-label="Close" onClick={(e) => { e.stopPropagation(); close(); }}
        style={{ position: "absolute", top: "calc(22px + env(safe-area-inset-top))", right: 16, width: 36, height: 36, borderRadius: 18, background: "rgba(255,255,255,.75)", border: "1px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4, cursor: "pointer" }}>
        <X size={16} color="#3A0A0E" />
      </button>

      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(64px + env(safe-area-inset-top))", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "0 22px", zIndex: 2 }}>
        {/* hanging sign */}
        <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", paddingTop: 21 }}>
          <span style={{ position: "absolute", top: 0, left: 32, width: 2.4, height: 26, background: "repeating-linear-gradient(#7C3AED 0, #7C3AED 3.8px, #FFE14D 3.8px, #FFE14D 7.6px)" }} />
          <span style={{ position: "absolute", top: 0, right: 32, width: 2.4, height: 26, background: "repeating-linear-gradient(#7C3AED 0, #7C3AED 3.8px, #FFE14D 3.8px, #FFE14D 7.6px)" }} />
          <div style={{ position: "relative", background: "#BDEFF0", borderRadius: 15, padding: 3.8, boxShadow: "0 6.7px 0 #12807C, 0 15px 28px rgba(120,10,20,.35)" }}>
            <div style={{ background: "#E8282B", borderRadius: 11.4, padding: 4.8 }}>
              <div style={{ border: "2.8px dotted #fff", borderRadius: 8.5, padding: "9px 22px 13px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5.7 }}>
                <div style={{ font: `400 min(66px, 16vw)/1 ${RYE}`, color: "#FFE14D", letterSpacing: 1, whiteSpace: "nowrap", textShadow: "0 1.9px 0 #FFB020, 0 3.8px 0 #B3121F, 0 5.7px 0 #6B0A12, 0 9.5px 11.4px rgba(0,0,0,.25)" }}>Diwali</div>
                <div style={{ height: 26, padding: "0 13px", borderRadius: 5.7, background: "#2346C9", display: "flex", alignItems: "center", font: `800 12.5px ${PJS}`, letterSpacing: "2.6px", color: "#fff", whiteSpace: "nowrap" }}>CREATOR CHALLENGE</div>
              </div>
            </div>
          </div>
          <div style={{ width: "78%", height: 11.4, marginTop: 6.7, background: "radial-gradient(circle at 50% 0, #FFE14D 5.7px, transparent 6.3px) 0 0 / 15.2px 11.4px repeat-x" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ font: `800 12px ${PJS}`, letterSpacing: 3, color: "#B8141F" }}>WIN UP TO</div>
          <div style={{ font: `400 min(58px, 14vw)/1 ${RYE}`, color: "#E8282B", textShadow: "0 3px 0 #FFB020", whiteSpace: "nowrap" }}>{amount}</div>
          <div style={{ marginTop: 6, font: `700 13px ${PJS}`, color: "#3A0A0E" }}>{firstLine}</div>
        </div>
      </div>

      <div aria-hidden="true" className="ybx-dw-art" style={{ position: "absolute", left: -10, right: -10, bottom: 236, pointerEvents: "none", zIndex: 1 }}>
        <img src="/diwali-entry-group.webp" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", display: "block", filter: "drop-shadow(0 14px 22px rgba(80,10,20,.3))" }} />
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: "32px 32px 0 0", background: "rgba(255,255,255,.92)", borderTop: "1px solid #fff", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", padding: "18px 18px calc(22px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12, cursor: "default" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: `700 12px ${PJS}`, color: "#B8141F" }} data-testid="entry-countdown">
          <span style={{ width: 7, height: 7, borderRadius: 4, background: "#E8282B" }} />
          Entries close in {left.d}d {pad(left.h)}h {pad(left.m)}m {pad(left.s)}s
        </div>
        <div style={{ font: `600 13px/1.45 ${PJS}`, color: "#3A3A44", textAlign: "center" }}>
          Post a reel with <b style={{ color: "#7C3AED" }}>{MENTION}</b> + {HASHTAG}, then add it in your Ybex portfolio.
        </div>
        <button type="button" onClick={join} style={{ height: 54, borderRadius: 27, background: "#7C3AED", border: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `800 16px ${PJS}`, color: "#fff", boxShadow: "0 10px 24px rgba(124,58,237,.35)", cursor: "pointer" }}>Join Challenge</button>
        {sponsors.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ font: `800 9px ${PJS}`, letterSpacing: "1.4px", color: "#A0A0AA" }}>POWERED BY</span>
            {sponsors.map((s) => (s.logo
              ? <img key={s.name} src={s.logo} alt={s.name} title={s.name} style={{ height: 20, maxWidth: 84, objectFit: "contain" }} />
              : <span key={s.name} style={{ font: `800 12px ${PJS}`, color: "#3A3A44" }}>{s.name}</span>))}
          </div>
        )}
      </div>
    </div>
  );
}
