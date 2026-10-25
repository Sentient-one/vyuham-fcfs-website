"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export default function Home() {
  const [clubs, setClubs] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");

  const refresh = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(`/api/clubs?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load clubs.");
      setClubs(data.clubs || []);
      if (!quiet) setLoading(false);
    } catch (error) {
      if (!quiet) {
        setStatus({
          type: "error",
          text:
            error.message ||
            "Could not connect. Refresh the page and try again.",
        });
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(true), 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  const claimed = clubs.filter((club) => club.claim).length;
  const available = clubs.length - claimed;
  const visibleClubs = useMemo(
    () =>
      clubs.filter((club) =>
        club.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [clubs, filter],
  );

  async function claimClub(club) {
    const name = playerName.trim();
    if (name.length < 2) {
      setStatus({
        type: "error",
        text: "Enter your WhatsApp group name first (at least 2 characters).",
      });
      return;
    }
    if (name.length > 40) {
      setStatus({
        type: "error",
        text: "Name must be 40 characters or fewer.",
      });
      return;
    }
    if (club.claim) return;
    setSubmitting(club.id);
    setStatus({ type: "", text: "" });
    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: club.id, playerName: name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Claim failed.");
      setStatus({
        type: "success",
        text: `Confirmed! ${club.name} is assigned to ${name}. Take a screenshot of this confirmation.`,
      });
      await refresh(true);
    } catch (error) {
      setStatus({
        type: "error",
        text: error.message || "Claim failed. Please try again.",
      });
      await refresh(true);
    } finally {
      setSubmitting("");
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">
          <span className="pulse" /> VYUHAM ESPORTS
        </div>
        <h1>
          eFootball <span>Club Draft</span>
        </h1>
        <p className="subtitle">
          32 clubs. One player per club. First come, first served.
        </p>
        <div className="stats">
          <div>
            <strong>{clubs.length || 32}</strong>
            <span>Total clubs</span>
          </div>
          <div>
            <strong className="green">{claimed}</strong>
            <span>Claimed</span>
          </div>
          <div>
            <strong className="blue">{available}</strong>
            <span>Available</span>
          </div>
        </div>
      </header>

      <section className="panel selection-panel">
        <div className="section-heading">
          <div>
            <p className="kicker">MAKE YOUR PICK</p>
            <h2>Choose your club</h2>
          </div>
          <span className="live">
            <i /> LIVE
          </span>
        </div>
        <label htmlFor="playerName">Your WhatsApp group name</label>
        <input
          id="playerName"
          maxLength={40}
          autoComplete="nickname"
          placeholder="Enter your exact group name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <p className="hint">
          Use the name admins will recognise. Your name will be visible to
          everyone.
        </p>
        <div className="toolbar">
          <label htmlFor="search">Available clubs</label>
          <input
            id="search"
            className="search"
            placeholder="Search clubs…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {status.text && (
          <div role="status" className={`notice ${status.type}`}>
            {status.text}
          </div>
        )}
        {loading ? (
          <div className="loading">Loading the club list…</div>
        ) : (
          <div className="club-grid">
            {visibleClubs.map((club) => {
              const isTaken = Boolean(club.claim);
              return (
                <article
                  key={club.id}
                  className={`club-card ${isTaken ? "taken" : ""}`}
                >
                  <div className="club-top">
                    <span
                      className={`status-dot ${isTaken ? "red-dot" : "green-dot"}`}
                    />
                    <span
                      className={`club-status ${isTaken ? "taken-text" : ""}`}
                    >
                      {isTaken ? "CLAIMED" : "AVAILABLE"}
                    </span>
                  </div>
                  <h3>{club.name}</h3>
                  {isTaken ? (
                    <p className="claimed-by">
                      Picked by <strong>{club.claim.player_name}</strong>
                    </p>
                  ) : (
                    <p className="claimed-by muted">Waiting for a player</p>
                  )}
                  <button
                    disabled={isTaken || Boolean(submitting)}
                    onClick={() => claimClub(club)}
                    className={
                      isTaken ? "claim-button disabled" : "claim-button"
                    }
                  >
                    {submitting === club.id
                      ? "Confirming…"
                      : isTaken
                        ? "Club taken"
                        : "Claim this club"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        {!loading && visibleClubs.length === 0 && (
          <p className="empty">No clubs match that search.</p>
        )}
        <p className="footnote">
          Availability refreshes automatically. A club is yours only after the
          server confirms your claim. If two people click at once, the first
          claim accepted by the server wins.
        </p>
      </section>
      <footer>
        <span>VYUHAM ESPORTS</span>
        <span>Play fair. Respect the pick.</span>
        <a
          href="#admin"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = "admin";
            window.dispatchEvent(new Event("open-admin"));
          }}
        >
          Admin
        </a>
      </footer>
      <AdminPanel onUpdated={() => refresh(true)} />
    </main>
  );
}

function AdminPanel({ onUpdated }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [claims, setClaims] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-admin", handler);
    if (window.location.hash === "#admin") setOpen(true);
    return () => window.removeEventListener("open-admin", handler);
  }, []);

  async function loadClaims() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${password}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Admin login failed.");
      setClaims(data.claims || []);
      setMessage("Admin access verified.");
    } catch (error) {
      setMessage(error.message || "Could not load claims.");
    } finally {
      setBusy(false);
    }
  }

  async function updateClaim(claim, nextName) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ clubId: claim.club_id, playerName: nextName }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not update claim.");
      setMessage(
        nextName.trim()
          ? "Claim corrected."
          : "Claim cleared; club is available again.",
      );
      await loadClaims();
      onUpdated();
    } catch (error) {
      setMessage(error.message || "Could not update claim.");
      setBusy(false);
    }
  }

  return (
    <section id="admin" className={`admin-panel ${open ? "admin-open" : ""}`}>
      <button className="admin-toggle" onClick={() => setOpen(!open)}>
        {open ? "Hide admin tools" : "Open admin tools"}
      </button>
      {open && (
        <div className="admin-inner">
          <p className="kicker">ADMIN ONLY</p>
          <h2>Manage claims</h2>
          <p className="hint">
            Use the admin password from your server environment. Never share it
            in the WhatsApp group.
          </p>
          <label htmlFor="adminPassword">Admin password</label>
          <input
            id="adminPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
          />
          <button
            className="claim-button admin-login"
            onClick={loadClaims}
            disabled={busy || !password}
          >
            {busy ? "Please wait…" : "Load claims"}
          </button>
          {message && <p className="admin-message">{message}</p>}
          {claims.length > 0 && (
            <div className="admin-claims">
              {claims.map((claim) => (
                <AdminClaim
                  key={claim.club_id}
                  claim={claim}
                  disabled={busy}
                  onSave={updateClaim}
                />
              ))}
            </div>
          )}
          {claims.length === 0 &&
            message.startsWith("Admin access verified") && (
              <p className="hint">No claims yet.</p>
            )}
        </div>
      )}
    </section>
  );
}

function AdminClaim({ claim, disabled, onSave }) {
  const [name, setName] = useState(claim.player_name || "");
  return (
    <div className="admin-claim">
      <div>
        <strong>{claim.club_name}</strong>
        <small>Claimed by {claim.player_name}</small>
      </div>
      <input
        aria-label={`Correct player name for ${claim.club_name}`}
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="admin-actions">
        <button
          disabled={disabled || name.trim() === claim.player_name}
          onClick={() => onSave(claim, name)}
        >
          Save
        </button>
        <button
          className="clear"
          disabled={disabled}
          onClick={() => {
            if (
              confirm(`Clear ${claim.club_name} and make it available again?`)
            )
              onSave(claim, "");
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
