"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Activity = { id: number; eventType: string; status: "success" | "error" | "info"; summary: string; nonce: number | null; createdAt: string };
type Message = { id: string; author: string; text: string; timestamp: string | null; sequence: number | null };
type Settings = { enabled: boolean; schedule: string; room: string; message: string; lastNonce: number | null; updatedAt: string };
type StatusData = { configured: boolean; did: string | null; technocore: { ok: boolean; latencyMs: number; error?: string }; settings: Settings; activities: Activity[]; warning: string };

type IconName = "pulse" | "shield" | "send" | "copy" | "refresh" | "clock" | "activity" | "arrow" | "alert" | "check" | "terminal";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    pulse: <><path d="M3 12h3l2-7 4 14 2-7h7" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.6-2.9 8.2-7 10-4.1-1.8-7-5.4-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    activity: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 4-6" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    alert: <><path d="M10.3 3.8 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    terminal: <><path d="m4 17 6-5-6-5M12 19h8" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(new Date(value)); } catch { return value; }
}

function shortDid(did: string | null) {
  if (!did) return "Belum tersedia";
  return `${did.slice(0, 22)}…${did.slice(-8)}`;
}

function scheduleCopy(value: string) {
  if (value === "*/30 * * * *") return "Setiap 30 menit · UTC";
  if (value === "0 * * * *") return "Setiap jam · UTC";
  if (value === "0 */6 * * *") return "Setiap 6 jam · UTC";
  if (value === "0 8 * * *") return "Setiap hari pukul 08:00 · UTC";
  return `${value} · UTC`;
}

export default function Home() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState("lobby");
  const [message, setMessage] = useState("FLOP agent check-in");
  const [schedule, setSchedule] = useState("*/30 * * * *");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [busy, setBusy] = useState<"checkin" | "lobby" | "schedule" | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadDashboard = async () => {
    try {
      const [statusResponse, lobbyResponse] = await Promise.all([fetch("/api/status"), fetch("/api/lobby")]);
      const nextStatus = await statusResponse.json() as StatusData;
      const nextLobby = await lobbyResponse.json() as { messages?: Message[] };
      setStatus(nextStatus);
      setMessages(nextLobby.messages ?? []);
      setRoom(nextStatus.settings.room);
      setMessage(nextStatus.settings.message);
      setSchedule(nextStatus.settings.schedule);
      setScheduleEnabled(nextStatus.settings.enabled);
    } catch {
      setToast({ type: "error", text: "Dashboard belum dapat memuat data. Coba refresh." });
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runCheckIn = async () => {
    setBusy("checkin");
    try {
      const response = await fetch("/api/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, message }) });
      const result = await response.json() as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Check-in gagal.");
      setToast({ type: "success", text: result.message ?? "Check-in berhasil diterima Technocore." });
      await loadDashboard();
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Check-in gagal." });
    } finally { setBusy(null); }
  };

  const refreshLobby = async () => {
    setBusy("lobby");
    try {
      const response = await fetch("/api/lobby", { cache: "no-store" });
      const result = await response.json() as { messages?: Message[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Lobby tidak dapat dimuat.");
      setMessages(result.messages ?? []);
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Lobby tidak dapat dimuat." });
    } finally { setBusy(null); }
  };

  const saveSchedule = async (nextEnabled = scheduleEnabled) => {
    setBusy("schedule");
    try {
      const response = await fetch("/api/schedule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: nextEnabled, schedule, room, message }) });
      const result = await response.json() as { ok?: boolean; error?: string; settings?: Settings };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Jadwal gagal disimpan.");
      setScheduleEnabled(nextEnabled);
      setToast({ type: "success", text: nextEnabled ? "Check-in terjadwal diaktifkan." : "Check-in terjadwal dijeda." });
      if (result.settings && status) setStatus({ ...status, settings: { ...status.settings, ...result.settings } });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Jadwal gagal disimpan." });
    } finally { setBusy(null); }
  };

  const copyDid = async () => {
    if (!status?.did) return;
    await navigator.clipboard.writeText(status.did);
    setToast({ type: "success", text: "DID publik disalin." });
  };

  const lastActivity = useMemo(() => status?.activities ?? [], [status]);
  const botReady = Boolean(status?.configured);
  const connected = Boolean(status?.technocore.ok);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><span /></span><span>FLOP <b>//</b> BOT</span></div>
        <div className="side-caption">AGENT CONTROL / 01</div>
        <nav className="nav" aria-label="Navigasi dashboard">
          <a className="nav-item active" href="#overview"><Icon name="activity" size={16} /> Overview</a>
          <a className="nav-item" href="#identity"><Icon name="shield" size={16} /> Identity</a>
          <a className="nav-item" href="#activity"><Icon name="pulse" size={16} /> Activity</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="live-chip"><span className="live-dot" /> SYSTEM ONLINE</div>
          <p>Bot bekerja melalui signed HTTP request. Secret tetap berada di server.</p>
          <div className="version"><span>v0.1 MVP</span><span>LOCAL / VERCEL</span></div>
        </div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar">
          <div><span className="eyebrow">FLOP LABS / TECHNОCORE</span><h1>Agent control center</h1></div>
          <div className="topbar-meta"><span className={`status-pill ${connected ? "ok" : "warn"}`}><span className="status-dot" /> {connected ? "Technocore connected" : "Connection check"}</span><span className="utc">UTC · {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span></div>
        </header>

        <div className="hero-line"><div><p className="kicker">YOUR AGENT, VISIBLE.</p><h2>Semua sinyal penting,<br /><em>di satu tempat.</em></h2><p className="hero-copy">Pantau identitas agen, kirim check-in yang ditandatangani, dan lihat aktivitas Technocore tanpa menyentuh secret key.</p></div><div className="hero-readout"><span>CONTROL STATUS</span><strong>{botReady ? "READY" : "SETUP REQUIRED"}</strong><small>{botReady ? "Seed server terhubung" : "Tambahkan SIGN_SEED di environment"}</small></div></div>

        {!botReady && <div className="setup-banner"><div className="banner-icon"><Icon name="alert" size={19} /></div><div><strong>Bot belum dikonfigurasi</strong><p>Tambahkan <code>SIGN_SEED</code> sebagai server-only environment variable di Vercel/Manus. Nilai ini tidak pernah dibaca dari browser.</p></div><span className="banner-tag">ACTION NEEDED</span></div>}

        <div className="metrics" aria-label="Ringkasan status">
          <div className="metric-card"><span className="metric-label">BOT STATUS</span><div className="metric-value"><span className={`big-dot ${botReady ? "green" : "amber"}`} />{botReady ? "Ready" : "Setup required"}</div><span className="metric-note">{botReady ? "Identity loaded securely" : "Server secret belum tersedia"}</span></div>
          <div className="metric-card"><span className="metric-label">TECHNOCORE</span><div className="metric-value"><span className={`big-dot ${connected ? "green" : "red"}`} />{connected ? "Connected" : "Unreachable"}</div><span className="metric-note">{connected ? `${status?.technocore.latencyMs ?? 0}ms response` : status?.technocore.error ?? "Menunggu pemeriksaan"}</span></div>
          <div className="metric-card"><span className="metric-label">LAST NONCE</span><div className="metric-value mono">{status?.settings.lastNonce ?? "—"}</div><span className="metric-note">Naik untuk setiap signed message</span></div>
        </div>

        <div className="workspace-grid">
          <div className="main-column">
            <section className="panel identity-panel" id="identity"><div className="panel-heading"><div><span className="eyebrow">01 / PUBLIC IDENTITY</span><h3>Agent identity</h3></div><span className="panel-code">ED25519</span></div><div className="did-block"><span className="field-label">DID PUBLIC KEY</span><div className="did-row"><code>{shortDid(status?.did ?? null)}</code><button className="icon-button" onClick={copyDid} disabled={!status?.did} aria-label="Salin DID publik"><Icon name="copy" size={16} /></button></div><p>Identitas ini dapat dibagikan. Seed privat tidak pernah ditampilkan.</p></div><div className="identity-footer"><div><span className="field-label">NETWORK</span><strong>Technocore / lobby</strong></div><div><span className="field-label">SIGNING</span><strong><span className="mini-dot green" /> Server-side only</strong></div></div></section>

            <section className="panel checkin-panel"><div className="panel-heading"><div><span className="eyebrow">02 / OUTBOUND SIGNAL</span><h3>Send check-in</h3></div><span className="panel-code">SIGNED GET</span></div><p className="panel-intro">Kirim pesan yang ditandatangani oleh DID agen ke room Technocore.</p><div className="form-row"><label><span className="field-label">ROOM</span><input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="lobby" /></label><label className="grow"><span className="field-label">MESSAGE</span><input value={message} maxLength={4096} onChange={(event) => setMessage(event.target.value)} placeholder="FLOP agent check-in" /></label></div><div className="action-row"><span className="hint"><span className="mini-dot" /> Nonce otomatis dikelola server</span><button className="primary-button" onClick={runCheckIn} disabled={busy !== null || !botReady}><span>{busy === "checkin" ? "Signing & sending…" : "Run signed check-in"}</span><Icon name="arrow" size={16} /></button></div></section>

            <section className="panel lobby-panel"><div className="panel-heading"><div><span className="eyebrow">03 / INBOUND SIGNAL</span><h3>Lobby pulse</h3></div><button className="text-button" onClick={refreshLobby} disabled={busy !== null}><Icon name="refresh" size={14} /> {busy === "lobby" ? "Refreshing" : "Refresh"}</button></div>{messages.length === 0 ? <div className="empty-state"><span className="empty-mark"><Icon name="terminal" size={22} /></span><strong>Belum ada pesan untuk ditampilkan</strong><p>Lobby kosong atau belum dapat dimuat dari Technocore.</p></div> : <div className="message-list">{messages.slice(-6).reverse().map((item) => <article className="message" key={item.id}><div className="message-avatar">{item.author.slice(0, 1).toUpperCase()}</div><div className="message-body"><div><strong>{item.author}</strong><time>{formatTime(item.timestamp)}</time></div><p>{item.text}</p></div></article>)}</div>}</section>
          </div>

          <aside className="right-column">
            <section className="panel schedule-panel"><div className="panel-heading"><div><span className="eyebrow">AUTOMATION</span><h3>Scheduled check-in</h3></div><span className={`toggle-state ${scheduleEnabled ? "on" : ""}`}>{scheduleEnabled ? "ON" : "OFF"}</span></div><p className="panel-intro">Vercel Cron memanggil endpoint bot secara berkala. Eksekusi hanya berjalan saat toggle aktif.</p><button className={`toggle ${scheduleEnabled ? "active" : ""}`} onClick={() => void saveSchedule(!scheduleEnabled)} disabled={busy === "schedule"} aria-pressed={scheduleEnabled}><span className="toggle-knob" /><span>{scheduleEnabled ? "Automation active" : "Automation paused"}</span></button><label className="select-label"><span className="field-label">FREQUENCY</span><select value={schedule} onChange={(event) => setSchedule(event.target.value)}><option value="*/30 * * * *">Every 30 minutes</option><option value="0 * * * *">Every hour</option><option value="0 */6 * * *">Every 6 hours</option><option value="0 8 * * *">Daily · 08:00 UTC</option></select></label><div className="next-run"><span className="field-label">NEXT EXECUTION</span><strong><Icon name="clock" size={15} /> {scheduleCopy(schedule)}</strong></div><button className="secondary-button" onClick={() => void saveSchedule()} disabled={busy !== null}>{busy === "schedule" ? "Saving…" : "Save schedule"}</button></section>

            <section className="panel security-panel"><div className="security-top"><div className="security-icon"><Icon name="shield" size={18} /></div><span className="eyebrow">SECURITY NOTE</span></div><h3>Keep the key, keep the identity.</h3><p><strong>DID bukan wallet address.</strong> Check-in juga tidak menjamin kelayakan atau pemberian $FLOP airdrop.</p><div className="security-rule" /><span className="security-foot"><Icon name="check" size={14} /> Seed tidak pernah dikirim ke client</span></section>

            <section className="panel connection-panel"><span className="eyebrow">SERVICE LINK</span><div className="service-line"><span className={`service-status ${connected ? "connected" : ""}`} /><div><strong>technocore.chat</strong><small>{connected ? "Operational · public endpoint" : "Health check failed"}</small></div><Icon name="arrow" size={15} /></div></section>
          </aside>
        </div>

        <section className="panel activity-panel" id="activity"><div className="panel-heading"><div><span className="eyebrow">04 / AUDIT TRAIL</span><h3>Recent activity</h3></div><span className="panel-code">NO SECRETS LOGGED</span></div>{lastActivity.length === 0 ? <div className="activity-empty">Belum ada aktivitas. Check-in pertama akan muncul di sini.</div> : <div className="activity-list">{lastActivity.map((item) => <div className="activity-row" key={item.id}><span className={`activity-icon ${item.status}`}><Icon name={item.status === "success" ? "check" : item.status === "error" ? "alert" : "clock"} size={14} /></span><div className="activity-copy"><strong>{item.eventType}</strong><span>{item.summary}</span></div><time>{formatTime(item.createdAt)}</time><span className={`activity-status ${item.status}`}>{item.status}</span></div>)}</div>}</section>

        <footer className="footer"><span>FLOP // BOT CONTROL CENTER</span><span>Server-side signing · No wallet custody · No airdrop guarantee</span></footer>
      </section>
      {toast && <div className={`toast ${toast.type}`} role="status"><span className="toast-icon"><Icon name={toast.type === "success" ? "check" : "alert"} size={15} /></span>{toast.text}</div>}
    </main>
  );
}
