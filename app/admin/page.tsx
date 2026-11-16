"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  id: string;
  telegramId: string;
  firstName: string;
  username: string | null;
  status: "active" | "blocked";
  createdAt: string;
  balance: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  async function setStatus(user: AdminUser, status: "active" | "blocked") {
    if (!window.confirm(`${status === "blocked" ? "Block" : "Unblock"} ${user.firstName}?`)) return;
    setBusyId(user.id);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      setUsers((current) => current.map((item) =>
        item.id === user.id ? { ...item, status } : item
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Admin controls</h1>
      <p>Manage account access. Every status change is recorded in the admin audit log.</p>
      <button onClick={() => void loadUsers()} disabled={loading}>Refresh</button>
      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {loading ? <p>Loading users…</p> : users.length === 0 ? <p>No users found.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead><tr>
              <th align="left">User</th><th align="left">Telegram ID</th>
              <th align="left">Status</th><th align="right">Balance</th><th align="right">Action</th>
            </tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.id} style={{ borderTop: "1px solid #ddd" }}>
                <td style={{ padding: 10 }}>{user.firstName}{user.username ? ` (@${user.username})` : ""}</td>
                <td>{user.telegramId}</td>
                <td>{user.status}</td>
                <td align="right">{user.balance}</td>
                <td align="right">
                  <button
                    disabled={busyId === user.id}
                    onClick={() => void setStatus(user, user.status === "active" ? "blocked" : "active")}
                  >
                    {busyId === user.id ? "Saving…" : user.status === "active" ? "Block" : "Unblock"}
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
